import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../../utils/commonUtils';

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
const PREMIUM_FROM_ORIGINAL_PROMPT = `TASK: Redraw this photograph as a premium-quality Korean webtoon illustration with cinematic production values. You are an ILLUSTRATOR — DRAW everything from scratch.

ART STYLE SPECIFICATION:
- Line art: Razor-sharp clean digital inking with professional line weight variation — bold contours, thin interior detail lines
- Coloring: Rich cinematic color grading with depth, contrast, and vibrant saturated tones
- Shading: Professional multi-layer cel-shading with dramatic volumetric shadows, rim lighting, and glowing highlight accents
- Eyes: Large expressive jewel-like eyes with multiple highlight layers and color reflections
- Hair: Complex detailed rendering with individual strand groups, light reflections, and color depth
- Clothing: Intricate fabric folds with proper light/shadow interaction, material texture differentiation
- Background: Highly detailed with atmospheric perspective, depth of field, and cinematic lighting
- Overall feel: Premium production quality — like a key visual from Solo Leveling, Omniscient Reader, or True Beauty

ANATOMY RULES (CRITICAL):
- Correct human proportions: head-to-body ratio ~1:7 for adults
- Exactly 5 fingers per hand, proper finger length proportions (middle finger longest)
- Arms and legs must have correct length relative to torso — no elongated or shortened limbs
- Shoulders, elbows, wrists, knees must bend at anatomically correct angles
- Faces must be symmetrical with proper eye spacing (one eye-width apart)
- Neck must be proportional to head size — not too thin or too thick
- DO NOT distort, stretch, or compress any body parts

FORMAT: Output as a single image preserving the original photo's aspect ratio.
Do NOT add any text, speech bubbles, logos, or watermarks.
DO NOT paste, composite, or filter the original photo — DRAW from scratch.`;

// Fallback when no original photo exists — upgrade existing webtoon
const PREMIUM_UPGRADE_PROMPT = `TASK: Enhance this webtoon illustration to premium quality. Preserve the exact composition, characters, and scene — only upgrade the visual quality.

ART STYLE SPECIFICATION:
- Line art: Sharpen and refine all linework with professional weight variation
- Coloring: Enrich colors with deeper saturation and better contrast
- Shading: Add multi-layer cel-shading with cinematic lighting, dramatic shadows, and rim light accents
- Background: Add atmospheric depth, detail, and depth of field effects
- Overall feel: Premium production quality upgrade while maintaining the original art direction

ANATOMY RULES (CRITICAL):
- Correct human proportions: head-to-body ratio ~1:7 for adults
- Exactly 5 fingers per hand, proper finger length proportions
- Arms and legs must have correct length relative to torso — no elongated or shortened limbs
- Faces must be symmetrical with proper eye spacing
- DO NOT distort, stretch, or compress any body parts — FIX any anatomy issues from the original

Preserve the exact same composition, characters, poses, and scene.
Do NOT add any text, speech bubbles, logos, or watermarks.`;

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
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt },
        ],
      }],
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

    // Call Gemini with retry logic
    let result: { imageBase64: string; mimeType: string } | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        console.log(`[Premium/Convert] Retry attempt ${attempt}/${MAX_RETRIES}`);
        await new Promise(r => setTimeout(r, 1000));
      }

      const attemptPrompt = attempt > 0
        ? `IMPORTANT: You MUST generate a new premium-quality illustrated image. Do NOT return the original or a photo-like result.\n\n${premiumPrompt}`
        : premiumPrompt;
      const attemptTemp = attempt > 0 ? 1.2 : (styleReference ? 0.8 : 1.0);

      try {
        result = await callGeminiPremium(apiKey, inputBase64, inputMimeType, attemptPrompt, attemptTemp);
      } catch (e) {
        if ((e as Error).message === 'QUOTA_EXCEEDED') {
          return NextResponse.json(
            { error: 'QUOTA_EXCEEDED', message: 'API quota reached. Please try again later.' },
            { status: 429 }
          );
        }
        // Other errors: continue to retry
      }

      if (result && result.imageBase64) break;
    }

    if (!result || !result.imageBase64) {
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
          `INSERT INTO premium_webtoons (id, user_id, source_webtoon_id, r2_key, prompt, episode_id, panel_index) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(imageId, userId, sourceWebtoonId || null, r2Key, 'premium-conversion', episodeId || null, panelIndex ?? null)
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
