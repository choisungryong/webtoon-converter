import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../../utils/commonUtils';

export const runtime = 'edge';

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

    // Extract Base64 data from Data URI
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json(
        { error: 'Invalid image format' },
        { status: 400 }
      );
    }
    const mimeType = `image/${base64Match[1]}`;
    const base64Data = base64Match[2];

    // Premium conversion prompt - Professional Korean Webtoon Episode Style
    // Focuses on visual quality, narrative flow, and character consistency
    const premiumPrompt = `
[TASK: PREMIUM KOREAN WEBTOON CONVERSION]

As a master webtoon artist, convert the input scenes into a high-quality vertical episode. 
The input image is a stack of multiple scenes. You must expand this into a rich, cinematic narrative.

### 🎨 ART STYLE & QUALITY
- **Style**: Modern premium Korean manhwa (webtoon). Sharp digital line art, professional cel-shading, and vibrant cinematic lighting.
- **Atmosphere**: Epic, emotional, and dynamic. Use polished color grading that matches the mood of the original scenes.
- **Details**: Intricate character designs, high-fidelity backgrounds, and varied depth of field.

### 📐 COMPOSITION & PANELS
- **Format**: EVERY single panel must be a TALL VERTICAL rectangle (800x1280 pixels). 
- **Orientation**: NEVER place panels horizontally. Stack them strictly one after another vertically.
- **Expansion**: For EACH input scene, create 2-3 distinct vertical panels (Close-up, Medium, Wide) to expand the story into a full episode.
- **Layout & Gutters**: Use **CLEAN WHITE gutters** (background) between panels. Avoid black or dark backgrounds for the layout.
- **Framing**: Keep characters fully within the frame. Ensure heads, hands, and feet are NOT cropped by the panel edges.

### 🚫 CRITICAL QUALITY CONSTRAINTS (MANDATORY)
- **Character Continuity**: Maintain gender, hair, eye color, and outfits perfectly across all panels.
- **Anatomic Accuracy**: Exactly 2 arms, 2 legs, 2 hands (5 fingers), and 2 feet per person. No distortions.
- **Anti-Cropping**: Keep characters comfortable within the frame. Do NOT cut off heads, hands, or feet at the edge.
- **Cleanliness**: NO text, NO speech bubbles, NO watermarks, and NO horizontal/square panels.

### FINAL CHECKLIST
1. Are there many more panels than the input scenes?
2. Is every panel a tall vertical rectangle?
3. Are the characters' bodies fully visible and anatomically correct?
4. Is the art style consistent and premium quality?
`.trim();

    // Call Gemini 2.5 Flash Image - Premium quality with enhanced settings
    // Note: gemini-3-pro-image is not yet available in v1beta API
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    console.log('[Premium/Convert] Calling Gemini API...');

    const geminiRes = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: premiumPrompt },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: 1.0,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
      }),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error(
        '[Premium/Convert] Gemini API Error:',
        geminiRes.status,
        errorText
      );

      if (geminiRes.status === 429) {
        return NextResponse.json(
          {
            error: 'QUOTA_EXCEEDED',
            message: 'API 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `Gemini Error: ${errorText}` },
        { status: 500 }
      );
    }

    const geminiData = await geminiRes.json();
    const candidates = geminiData.candidates;

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    const parts = candidates[0]?.content?.parts || [];
    let generatedImageBase64 = null;
    let generatedMimeType = 'image/png';

    for (const part of parts) {
      if (part.inlineData) {
        generatedImageBase64 = part.inlineData.data;
        generatedMimeType = part.inlineData.mimeType || 'image/png';
        break;
      }
    }

    if (!generatedImageBase64) {
      return NextResponse.json(
        { error: 'Gemini did not return an image' },
        { status: 500 }
      );
    }

    // Save to R2 and DB
    const imageId = generateUUID();
    const r2Key = `premium/${imageId}.png`;

    if (env.R2 && env.DB) {
      try {
        // Save to R2
        const binaryString = atob(generatedImageBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        await env.R2.put(r2Key, bytes, {
          httpMetadata: { contentType: generatedMimeType },
        });

        // Save to DB
        await env.DB.prepare(
          `INSERT INTO premium_webtoons (id, user_id, source_webtoon_id, r2_key, prompt) VALUES (?, ?, ?, ?, ?)`
        )
          .bind(
            imageId,
            userId,
            sourceWebtoonId || null,
            r2Key,
            'premium-conversion'
          )
          .run();

        console.log('[Premium/Convert] Saved to R2 and DB:', imageId);
      } catch (saveError) {
        console.error('[Premium/Convert] Save error:', saveError);
      }
    }

    // Return generated image
    const outputDataUri = `data:${generatedMimeType};base64,${generatedImageBase64}`;

    return NextResponse.json({
      success: true,
      image: outputDataUri,
      imageId: imageId,
      saved: !!(env.R2 && env.DB),
    });
  } catch (error) {
    console.error('[Premium/Convert] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
