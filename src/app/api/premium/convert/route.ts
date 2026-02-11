import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../../utils/commonUtils';
import { getUserFromRequest } from '../../../../lib/auth';
import { checkAndDeductCredits, refundCredits, CREDIT_COSTS } from '../../../../lib/credits';

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
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

// Used when we have the original photo — best quality path
const PREMIUM_FROM_ORIGINAL_PROMPT = `You are a premium Korean webtoon illustrator creating a BRAND NEW hand-drawn illustration from scratch. The attached photograph is ONLY a composition guide — you must redraw EVERY element as illustrated artwork.

Draw every person including ALL background bystanders and passersby, every object, and the ENTIRE environment — sky, ground, walls, streets, furniture, trees, buildings — using razor-sharp digital inking with professional line weight variation, rich cinematic color grading, and multi-layer cel-shading with dramatic volumetric shadows and rim lighting. Render eyes as large expressive jewels with multiple highlight layers, hair with individual strand groups and light reflections, clothing with intricate fabric folds. The background must be a fully illustrated environment with atmospheric perspective, depth of field, and cinematic lighting — like a key visual from Solo Leveling, Omniscient Reader, or True Beauty. Every single pixel must be hand-drawn artwork — no photographic surfaces, textures, or people anywhere. Preserve the exact composition, poses, and expressions with correct anatomy. No text, speech bubbles, or watermarks. Remember: background people must be drawn with the same level of detail as foreground people.`;

// Fallback when no original photo exists — upgrade existing webtoon
const PREMIUM_UPGRADE_PROMPT = `Enhance this webtoon illustration to premium production quality while preserving the exact composition, characters, poses, and scene. Sharpen and refine all linework with professional weight variation, enrich colors with deeper saturation and better contrast, add multi-layer cel-shading with cinematic lighting, dramatic shadows, and rim light accents. Redraw the background with atmospheric depth, added detail, and depth of field effects. Fix any anatomy issues to ensure correct human proportions and proper finger counts. Produce a clean image with no text, speech bubbles, or watermarks.`;

// Escalating retry prompts
const PREMIUM_RETRY_PROMPTS = [
  `FAILED QUALITY CHECK: Your previous output left background people and environmental surfaces looking like real photographs. THIS ATTEMPT MUST FIX: (1) Redraw ALL background bystanders with visible outlines and cel-shading. (2) Redraw the ENTIRE sky, ground, walls, streets with illustrated textures. (3) Every surface needs drawn outlines — zero photographic remnants.\n\n`,
  `SECOND FAILED QUALITY CHECK: Background people and environment are STILL photographic. Create a 100% hand-drawn illustration where every pixel is artwork. Draw thick visible outlines around EVERY person including distant bystanders. Fill EVERY surface with flat illustrated colors. Redraw the ENTIRE scene from scratch as manhwa illustration.\n\n`,
];

/**
 * Quality gate: checks if the generated image is fully illustrated
 */
async function checkIllustrationQuality(
  apiKey: string,
  imageBase64: string,
  imageMimeType: string,
): Promise<{ pass: boolean; score: number }> {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
            { text: 'Examine this image carefully. Check these specific areas: (1) Are ALL background/surrounding people drawn as illustrations or do they look like real photographs? (2) Is the sky/ceiling fully illustrated or photographic? (3) Are the ground/floor/street surfaces drawn or photorealistic? (4) Are walls, buildings, and furniture illustrated with line art or photographic? Rate from 1 to 10 where 10 means every element is fully illustrated artwork and 1 means significant areas are still photographic. Be strict — if even one background person or environmental area looks photorealistic, score 5 or below. Reply with ONLY a single number.' },
          ],
        }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    clearTimeout(timeoutId);
    if (!res.ok) return { pass: true, score: 10 };

    const data = await res.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\d+/);
    const score = match ? parseInt(match[0], 10) : 10;

    console.log(`[Premium Quality Check] Score: ${score}/10, raw: "${text.trim()}"`);
    return { pass: score >= 8, score };
  } catch (e) {
    console.warn('[Premium Quality Check] Error, skipping:', e);
    return { pass: true, score: 10 };
  }
}

/**
 * Call Gemini and return generated image or null.
 */
async function callGeminiPremium(
  apiKey: string,
  base64Data: string,
  mimeType: string,
  prompt: string,
  temperature: number,
): Promise<{ imageBase64: string; mimeType: string } | null> {
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;

  const res = await fetch(geminiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { text: '\n[COMPOSITION REFERENCE — redraw this entire scene from scratch as illustration]:' },
          { inlineData: { mimeType, data: base64Data } },
        ],
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        temperature,
        imageConfig: {
          personGeneration: 'ALLOW_ALL',
          imageSize: '2K',
        },
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
    };

    const { image, sourceWebtoonId, userId, storyDirection, episodeId, panelIndex, styleReference } = body;

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
    let premiumPrompt = PREMIUM_UPGRADE_PROMPT;
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
            premiumPrompt = PREMIUM_FROM_ORIGINAL_PROMPT;
            usedOriginal = true;
            console.log('[Premium/Convert] Using original photo from R2:', row.original_r2_key);
          }
        }
      } catch (lookupError) {
        console.warn('[Premium/Convert] Original lookup failed, using provided image:', lookupError);
      }
    }

    // Append story direction to prompt if provided (episode mode)
    if (storyDirection) {
      premiumPrompt += `\n\nSTORY DIRECTION FOR THIS PANEL:\n${storyDirection}`;
    }

    // Call Gemini with retry logic + quality gate
    let result: { imageBase64: string; mimeType: string } | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        console.log(`[Premium/Convert] Retry attempt ${attempt}/${MAX_RETRIES}`);
        await new Promise(r => setTimeout(r, 1000));
      }

      // Escalating prompts on retry
      const attemptPrompt = attempt > 0
        ? (PREMIUM_RETRY_PROMPTS[attempt - 1] || PREMIUM_RETRY_PROMPTS[PREMIUM_RETRY_PROMPTS.length - 1]) + premiumPrompt
        : premiumPrompt;
      const attemptTemp = attempt > 0 ? 1.0 : (styleReference ? 0.6 : 0.8);

      try {
        result = await callGeminiPremium(apiKey, inputBase64, inputMimeType, attemptPrompt, attemptTemp);
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
        const quality = await checkIllustrationQuality(apiKey, result.imageBase64, result.mimeType);
        if (quality.pass) {
          console.log(`[Premium/Convert] Quality check passed (score: ${quality.score})`);
          break;
        }
        console.log(`[Premium/Convert] Quality check failed (score: ${quality.score}), retrying...`);
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
