import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getUserFromRequest } from '../../../../lib/auth';
import { checkAndDeductCredits, refundCredits, CREDIT_COSTS } from '../../../../lib/credits';
import { buildBasicPromptParts } from '../../../../lib/promptBuilder';
import { validateIllustrationQuality } from '../../../../lib/qualityValidator';
import { callGemini } from '../../../../lib/gemini';
import type { SceneAnalysis } from '../../../../types';

export const runtime = 'edge';

const MAX_RETRIES = 2;
const RATE_LIMIT_PER_MINUTE = 10;

/** Simple per-user rate limiting using usage_logs table */
async function checkRateLimit(db: any, userId: string): Promise<boolean> {
  if (!db || !userId) return true; // Skip if no DB or user
  try {
    const oneMinuteAgo = Date.now() - 60_000;
    const result = await db.prepare(
      `SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND created_at > ?`
    ).bind(userId, oneMinuteAgo).first() as any;
    return (result?.count || 0) < RATE_LIMIT_PER_MINUTE;
  } catch {
    return true; // Fail open — don't block if DB check fails
  }
}

async function logUsage(db: any, userId: string): Promise<void> {
  if (!db || !userId) return;
  try {
    const { generateUUID } = await import('../../../../utils/commonUtils');
    await db.prepare(
      `INSERT INTO usage_logs (id, user_id, action, created_at) VALUES (?, ?, 'convert', ?)`
    ).bind(generateUUID(), userId, Date.now()).run();
  } catch { /* best effort */ }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'alive',
    message: 'Gemini API Worker is Running (Synchronous Mode)',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API/Start] POST Request received');

    // 1. Parse Request
    let body;
    try {
      body = (await request.json()) as {
        image: string;
        styleId?: string;
        prompt?: string;
        userId?: string;
        styleReference?: string; // base64 data URI of first converted result for consistency
        sceneAnalysis?: SceneAnalysis;
      };
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { image, styleId = 'classic-webtoon', styleReference, sceneAnalysis } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const { env } = getRequestContext();
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Server Config Error: API Key missing' }, { status: 500 });
    }

    // 1b. Rate limit check
    const allowed = await checkRateLimit(env.DB, body.userId || '');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    // 1c. Credit check
    let authUser: any = null;
    try { authUser = await getUserFromRequest(request, env); } catch { /* optional */ }
    const creditResult = await checkAndDeductCredits(env.DB, {
      userId: authUser?.id || null,
      legacyUserId: body.userId || '',
      isAuthenticated: !!authUser,
      cost: CREDIT_COSTS.basic_convert,
      reason: 'basic_convert',
    });
    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error || 'INSUFFICIENT_CREDITS' },
        { status: 402 }
      );
    }

    // 2. Validate and parse base64 image
    const ALLOWED_MIME_TYPES = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
    const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // ~7.5MB decoded

    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) throw new Error('Invalid image format');

    const imageType = base64Match[1].toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(imageType)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    const base64Data = base64Match[2];
    if (base64Data.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Image too large. Please use a smaller image.' }, { status: 413 });
    }

    const mimeType = `image/${imageType}`;

    // 2b. Parse style reference if provided (for multi-image consistency)
    let styleRef: { data: string; mimeType: string } | null = null;
    if (styleReference) {
      const refMatch = styleReference.match(/^data:image\/(\w+);base64,(.+)$/);
      if (refMatch) {
        styleRef = {
          mimeType: `image/${refMatch[1].toLowerCase()}`,
          data: refMatch[2],
        };
      }
    }

    // 3. Call Gemini with retry logic + multi-dimensional quality gate
    let result: { imageBase64: string; mimeType: string } | null = null;
    let retried = false;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      if (isRetry) {
        retried = true;
        console.log(`[API/Start] Retry attempt ${attempt}/${MAX_RETRIES}`);
      }

      // Build prompt parts using 5-Step LOCK system
      const { parts, temperature } = buildBasicPromptParts(base64Data, mimeType, {
        styleId,
        styleRef,
        sceneAnalysis: sceneAnalysis || null,
        retryLevel: attempt,
      });

      result = await callGemini(apiKey, parts, temperature);

      if (!result?.imageBase64) {
        // No image at all — wait and retry
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      // Quality gate: multi-dimensional validation (skip on final attempt)
      if (attempt < MAX_RETRIES) {
        const quality = await validateIllustrationQuality({
          apiKey,
          imageBase64: result.imageBase64,
          imageMimeType: result.mimeType,
          sceneAnalysis: sceneAnalysis || null,
          hasStyleAnchor: !!styleRef,
        });
        if (quality.pass) {
          console.log(`[API/Start] Quality validation passed`);
          break;
        }
        console.log(`[API/Start] Quality validation failed: ${quality.failedDimensions.join(', ')}, retrying...`);
        result = null; // force retry
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!result || !result.imageBase64) {
      // Refund credits on failure
      if (authUser?.id) {
        try { await refundCredits(env.DB, authUser.id, CREDIT_COSTS.basic_convert, 'basic_convert_refund'); } catch { /* best effort */ }
      }
      return NextResponse.json({ error: 'Image generation failed after retries. Please try again.' }, { status: 502 });
    }

    // Log successful usage for rate limiting
    await logUsage(env.DB, body.userId || '');

    const outputDataUri = `data:${result.mimeType};base64,${result.imageBase64}`;

    // 4. Return Success
    return NextResponse.json({
      success: true,
      result_url: outputDataUri,
      ...(retried && { retried: true }),
    });

  } catch (error) {
    console.error('API Start Error:', error);
    const msg = (error as Error).message;
    const safeMsg = msg.includes('Invalid image format') ? msg : 'Internal server error';
    return NextResponse.json(
      { error: safeMsg },
      { status: 500 }
    );
  }
}
