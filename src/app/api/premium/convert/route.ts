import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../../utils/commonUtils';

export const runtime = 'edge';

const MAX_RETRIES = 2;

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

// Used when we have the original photo — best quality path
const PREMIUM_FROM_ORIGINAL_PROMPT = `Completely redraw this photograph as a premium-quality Korean webtoon illustration with cinematic production values. Do not apply a filter — create an entirely new masterpiece illustration from scratch.

STYLE: Premium modern Korean webtoon art (like Solo Leveling, Omniscient Reader, or True Beauty at their highest production quality). Razor-sharp clean digital linework with professional multi-layer cel-shading. Cinematic lighting with dramatic volumetric shadows, rim lighting, and glowing highlights. Rich cinematic color grading with depth and contrast. Highly detailed backgrounds with atmospheric perspective and depth of field. Character designs with complex detailed hair rendering, intricate clothing folds, expressive jewel-like eyes, and refined facial features.

FORMAT: Output as a single image preserving the original photo's aspect ratio.

OUTPUT REQUIREMENTS:
- The result must be a PREMIUM ILLUSTRATED DRAWING with significantly more detail and polish than a standard webtoon conversion
- Preserve the original composition, characters, poses, and expressions from the photograph
- Do not add any text, speech bubbles, or watermarks
- Correct human anatomy: 2 arms, 2 legs, 2 hands with 5 fingers each
- Characters must be fully contained within the frame — do not crop heads or limbs`;

// Fallback when no original photo exists — upgrade existing webtoon
const PREMIUM_UPGRADE_PROMPT = `Enhance this webtoon illustration to premium quality with significantly improved detail, lighting, and artistic refinement. Preserve the exact composition, characters, and scene — only upgrade the visual quality.

STYLE: Premium modern Korean webtoon art with sharper linework, richer cel-shading with multiple tonal layers, cinematic lighting with dramatic shadows and glowing highlights, and more detailed backgrounds with depth of field.

OUTPUT REQUIREMENTS:
- Preserve the exact same composition, characters, poses, and scene
- Enhance: sharper lines, richer colors, better lighting, more background detail
- Do not add any text, speech bubbles, or watermarks
- Correct human anatomy: 2 arms, 2 legs, 2 hands with 5 fingers each`;

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
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

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
        responseModalities: ['IMAGE'],
        temperature,
        topP: 0.8,
        topK: 40,
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
    };

    const { image, sourceWebtoonId, userId } = body;

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
      const attemptTemp = attempt > 0 ? 1.2 : 1.0;

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
          `INSERT INTO premium_webtoons (id, user_id, source_webtoon_id, r2_key, prompt) VALUES (?, ?, ?, ?, ?)`
        )
          .bind(imageId, userId, sourceWebtoonId || null, r2Key, 'premium-conversion')
          .run();

        saved = true;
        console.log('[Premium/Convert] Saved to R2 and DB:', imageId);
      } catch (saveError) {
        console.error('[Premium/Convert] Save error:', saveError);
        // Attempt R2 rollback if DB save failed
        try { await env.R2.delete(r2Key); } catch { /* best effort */ }
      }
    }

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
