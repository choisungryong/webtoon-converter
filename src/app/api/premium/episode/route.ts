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

function buildEpisodePrompt(imageCount: number, panelCount: number): string {
  return `Completely redraw these ${imageCount} reference photographs as a single continuous Korean webtoon episode page. Do not apply filters to the photos — illustrate everything from scratch as hand-drawn manhwa art.

STYLE: Premium Korean webtoon illustration in the style of Solo Leveling, True Beauty, or Lookism. Sharp clean digital linework with smooth cel-shading. Characters redrawn as manhwa characters with anime-style expressive eyes, defined jawlines, and stylized proportions. Vibrant colors with gradient shading and cinematic lighting. Rich detailed backgrounds with depth of field.

CHARACTER RULES: Study each person in the reference photos carefully. Redraw them as illustrated manhwa characters while preserving their gender, hair color, outfit colors, and distinguishing features. Maintain perfect character consistency across all panels — the same character must look identical in every panel they appear in.

LAYOUT: Create a single tall vertical image (800 x 2400 pixels). Arrange ${panelCount} panels vertically for webtoon scroll format. Use dynamic panel shapes with a mix of 2-3 large dramatic panels and smaller reaction panels. Clean white gutters between panels.

STORYTELLING: Each panel shows a different moment from the reference scenes. Use varied camera angles — close-ups for emotion, medium shots for dialogue, wide shots for establishing scenes. Add speed lines, emotion effects, and screen tones where they enhance the narrative.

OUTPUT REQUIREMENTS:
- The result must be 100% ILLUSTRATED MANHWA ART, not photographs with effects
- Preserve the original scenes, characters, and narrative flow from the references
- Do not add any text, speech bubbles, or watermarks
- Correct human anatomy: 2 arms, 2 legs, 2 hands with 5 fingers each
- Characters fully contained within frames — do not crop heads or limbs at panel edges`;
}

/**
 * Call Gemini with multi-image input and return generated image or null.
 */
async function callGeminiEpisode(
  apiKey: string,
  imageParts: { inlineData: { mimeType: string; data: string } }[],
  prompt: string,
  temperature: number,
): Promise<{ imageBase64: string; mimeType: string } | null> {
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

  const parts: any[] = [...imageParts, { text: prompt }];

  const res = await fetch(geminiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
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
    console.error('[Premium/Episode] Gemini API Error:', res.status, errorText);
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
    console.log('[Premium/Episode] POST Request received');

    const { env } = getRequestContext();
    const body = (await request.json()) as {
      images: string[];
      userId: string;
    };

    const { images, userId } = body;

    if (!images || images.length === 0 || !userId) {
      return NextResponse.json(
        { error: 'Missing images or userId' },
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

    // Parse all images
    const imageParts: { inlineData: { mimeType: string; data: string } }[] = [];

    for (const image of images) {
      const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!base64Match) {
        console.warn('[Premium/Episode] Skipping invalid image format');
        continue;
      }
      imageParts.push({
        inlineData: {
          mimeType: `image/${base64Match[1]}`,
          data: base64Match[2],
        },
      });
    }

    if (imageParts.length === 0) {
      return NextResponse.json(
        { error: 'No valid images provided' },
        { status: 400 }
      );
    }

    const panelCount = Math.max(imageParts.length, 10);
    const basePrompt = buildEpisodePrompt(imageParts.length, panelCount);

    // Call Gemini with retry logic
    let result: { imageBase64: string; mimeType: string } | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        console.log(`[Premium/Episode] Retry attempt ${attempt}/${MAX_RETRIES}`);
        await new Promise(r => setTimeout(r, 1000));
      }

      const attemptPrompt = attempt > 0
        ? `IMPORTANT: You MUST generate a new illustrated webtoon episode image. Do NOT return photos or photo-like results.\n\n${basePrompt}`
        : basePrompt;
      const attemptTemp = attempt > 0 ? 1.2 : 1.0;

      try {
        result = await callGeminiEpisode(apiKey, imageParts, attemptPrompt, attemptTemp);
      } catch (e) {
        if ((e as Error).message === 'QUOTA_EXCEEDED') {
          return NextResponse.json(
            { error: 'QUOTA_EXCEEDED', message: 'API quota reached. Please try again later.' },
            { status: 429 }
          );
        }
      }

      if (result && result.imageBase64) break;
    }

    if (!result || !result.imageBase64) {
      return NextResponse.json(
        { error: 'Episode generation failed after retries. Please try again.' },
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
          .bind(imageId, userId, null, r2Key, `episode-${imageParts.length}-images`)
          .run();

        saved = true;
        console.log('[Premium/Episode] Saved to R2 and DB:', imageId);
      } catch (saveError) {
        console.error('[Premium/Episode] Save error:', saveError);
        try { await env.R2.delete(r2Key); } catch { /* best effort */ }
      }
    }

    const outputDataUri = `data:${result.mimeType};base64,${result.imageBase64}`;

    return NextResponse.json({
      success: true,
      image: outputDataUri,
      imageId: imageId,
      panelCount: panelCount,
      saved,
    });
  } catch (error) {
    console.error('[Premium/Episode] Error:', error);
    return NextResponse.json(
      { error: 'Episode generation failed' },
      { status: 500 }
    );
  }
}
