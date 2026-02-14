import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../../utils/commonUtils';
import { getUserFromRequest } from '../../../../lib/auth';
import { checkAndDeductCredits, refundCredits, CREDIT_COSTS } from '../../../../lib/credits';
import { buildPremiumPromptParts } from '../../../../lib/promptBuilder';
import { validateIllustrationQuality } from '../../../../lib/qualityValidator';
import type { SceneAnalysis } from '../../../../types';

export const runtime = 'edge';

const MAX_RETRIES = 2;
const RATE_LIMIT_PER_MINUTE = 5;

/** Simple per-user rate limiting using usage_logs table */
async function checkRateLimit(db: any, userId: string): Promise<boolean> {
  if (!db || !userId) return true;
  try {
    const oneMinuteAgo = Date.now() - 60_000;
    const result = await db.prepare(
      `SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND action = 'premium_convert' AND created_at > ?`
    ).bind(userId, oneMinuteAgo).first() as any;
    return (result?.count || 0) < RATE_LIMIT_PER_MINUTE;
  } catch {
    return true;
  }
}

async function logPremiumUsage(db: any, userId: string): Promise<void> {
  if (!db || !userId) return;
  try {
    await db.prepare(
      `INSERT INTO usage_logs (id, user_id, action, created_at) VALUES (?, ?, 'premium_convert', ?)`
    ).bind(generateUUID(), userId, Date.now()).run();
  } catch { /* best effort */ }
}

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
];

/**
 * Call Gemini and return generated image or null.
 */
async function callGeminiPremium(
  apiKey: string,
  parts: any[],
  temperature: number,
): Promise<{ imageBase64: string; mimeType: string } | null> {
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

  const res = await fetch(geminiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        temperature,
      },
      safetySettings: SAFETY_SETTINGS,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[Premium/Convert] Gemini API Error:', res.status, errorText);
    // Propagate 429 as a special case
    if (res.status === 429) {
      throw new Error('QUOTA_EXCEEDED');
    }
    return null;
  }

  const data = await res.json() as any;
  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) return null;

  const responseParts = candidates[0]?.content?.parts || [];
  for (const part of responseParts) {
    if (part.inlineData) {
      return {
        imageBase64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
      };
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Premium/Convert] POST Request received');

    const { env } = getRequestContext();
    const body = (await request.json()) as {
      image: string;
      sourceWebtoonId?: string;
      userId: string;
      storyDirection?: string;
      episodeId?: string;
      panelIndex?: number;
      styleReference?: string;
      sceneAnalysis?: SceneAnalysis;
    };

    const { image, sourceWebtoonId, userId, storyDirection, episodeId, panelIndex, sceneAnalysis } = body;

    if (!image || !userId) {
      return NextResponse.json(
        { error: 'Missing image or userId' },
        { status: 400 }
      );
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key not configured' },
        { status: 500 }
      );
    }

    // Rate limit check
    const allowed = await checkRateLimit(env.DB, userId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    // Credit check
    let authUser: any = null;
    try { authUser = await getUserFromRequest(request, env); } catch { /* optional */ }
    const creditResult = await checkAndDeductCredits(env.DB, {
      userId: authUser?.id || null,
      legacyUserId: userId,
      isAuthenticated: !!authUser,
      cost: CREDIT_COSTS.premium_convert,
      reason: 'premium_convert',
    });
    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error || 'INSUFFICIENT_CREDITS' },
        { status: 402 }
      );
    }

    // Extract Base64 data from the provided image (fallback)
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json(
        { error: 'Invalid image format' },
        { status: 400 }
      );
    }

    // Try to fetch original photo from R2 for best quality
    let inputBase64 = base64Match[2];
    let inputMimeType = `image/${base64Match[1]}`;
    let usedOriginal = false;

    if (sourceWebtoonId && env.DB && env.R2) {
      try {
        const row = await env.DB.prepare(
          `SELECT original_r2_key FROM generated_images WHERE id = ?`
        ).bind(sourceWebtoonId).first() as any;

        if (row?.original_r2_key) {
          const r2Object = await env.R2.get(row.original_r2_key);
          if (r2Object) {
            const arrayBuffer = await r2Object.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            inputBase64 = btoa(binary);
            inputMimeType = r2Object.httpMetadata?.contentType || 'image/jpeg';
            usedOriginal = true;
            console.log('[Premium/Convert] Using original photo from R2:', row.original_r2_key);
          }
        }
      } catch (lookupError) {
        console.warn('[Premium/Convert] Original lookup failed, using provided image:', lookupError);
      }
    }

    // Call Gemini with retry logic + multi-dimensional quality gate
    let result: { imageBase64: string; mimeType: string } | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        console.log(`[Premium/Convert] Retry attempt ${attempt}/${MAX_RETRIES}`);
        await new Promise(r => setTimeout(r, 1000));
      }

      // Build prompt parts using 5-Step LOCK system
      const { parts, temperature } = buildPremiumPromptParts(inputBase64, inputMimeType, {
        usedOriginal,
        storyDirection,
        sceneAnalysis: sceneAnalysis || null,
        retryLevel: attempt,
      });

      try {
        result = await callGeminiPremium(apiKey, parts, temperature);
      } catch (e) {
        if ((e as Error).message === 'QUOTA_EXCEEDED') {
          return NextResponse.json(
            { error: 'QUOTA_EXCEEDED', message: 'API quota reached. Please try again later.' },
            { status: 429 }
          );
        }
      }

      if (!result?.imageBase64) continue;

      // Quality gate (skip on final attempt — accept best effort)
      if (attempt < MAX_RETRIES && usedOriginal) {
        const quality = await validateIllustrationQuality({
          apiKey,
          imageBase64: result.imageBase64,
          imageMimeType: result.mimeType,
          sceneAnalysis: sceneAnalysis || null,
          hasStyleAnchor: false,
        });
        if (quality.pass) {
          console.log(`[Premium/Convert] Quality validation passed`);
          break;
        }
        console.log(`[Premium/Convert] Quality validation failed: ${quality.failedDimensions.join(', ')}, retrying...`);
        result = null;
      } else {
        break;
      }
    }

    if (!result || !result.imageBase64) {
      // Refund credits on failure
      if (authUser?.id) {
        try { await refundCredits(env.DB, authUser.id, CREDIT_COSTS.premium_convert, 'premium_convert_refund'); } catch { /* best effort */ }
      }
      return NextResponse.json(
        { error: 'Premium conversion failed after retries. Please try again.' },
        { status: 502 }
      );
    }

    // Save to R2 and DB
    const imageId = generateUUID();
    const r2Key = `premium/${imageId}.png`;
    let saved = false;

    if (env.R2 && env.DB) {
      try {
        const binaryString = atob(result.imageBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        await env.R2.put(r2Key, bytes, {
          httpMetadata: { contentType: result.mimeType },
        });

        await env.DB.prepare(
          `INSERT INTO generated_images (id, user_id, r2_key, type, prompt) VALUES (?, ?, ?, ?, ?)`
        )
          .bind(imageId, userId, r2Key, 'premium', 'premium-conversion')
          .run();

        // If part of an episode, update episode's panel_ids and status
        if (episodeId && panelIndex !== undefined) {
          try {
            const epRow = await env.DB.prepare(
              `SELECT panel_ids, story_data FROM premium_episodes WHERE id = ? AND user_id = ?`
            ).bind(episodeId, userId).first() as any;

            if (epRow) {
              const panelIds: string[] = JSON.parse(epRow.panel_ids || '[]');
              panelIds[panelIndex] = imageId;

              const storyData = JSON.parse(epRow.story_data || '{}');
              const totalPanels = storyData.panels?.length || 0;
              const completedPanels = panelIds.filter(Boolean).length;
              const newStatus = completedPanels >= totalPanels ? 'complete' : 'generating';

              await env.DB.prepare(
                `UPDATE premium_episodes SET panel_ids = ?, status = ? WHERE id = ?`
              ).bind(JSON.stringify(panelIds), newStatus, episodeId).run();
            }
          } catch (epErr) {
            console.error('[Premium/Convert] Episode update error:', epErr);
          }
        }

        saved = true;
        console.log('[Premium/Convert] Saved to R2 and DB:', imageId);
      } catch (saveError) {
        console.error('[Premium/Convert] Save error:', saveError);
        // Attempt R2 rollback if DB save failed
        try { await env.R2.delete(r2Key); } catch { /* best effort */ }
      }
    }

    // Log successful usage for rate limiting
    await logPremiumUsage(env.DB, userId);

    const outputDataUri = `data:${result.mimeType};base64,${result.imageBase64}`;

    return NextResponse.json({
      success: true,
      image: outputDataUri,
      imageId: imageId,
      saved,
      usedOriginal,
    });
  } catch (error) {
    console.error('[Premium/Convert] Error:', error);
    return NextResponse.json(
      { error: 'Premium conversion failed' },
      { status: 500 }
    );
  }
}
