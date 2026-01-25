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
**Role & Goal:** Act as a master Korean webtoon artist. Your sole task is to transform the provided scene descriptions into a single, high-quality, vertical scroll webtoon episode strip.

**Input Scenes to Visualize:**
\`[SCENE DESCRIPTIONS: 여기에 변환할 이야기의 장면들을 순서대로 상세히 묘사하세요. 예: "1. 검은 후드를 쓴 남자가 비 오는 골목길을 걸어간다. 2. 그가 멈춰 서서 뒤를 돌아본다. 3. 놀란 표정의 여자 주인공과 마주친다."]\`

**🚫 ABSOLUTE ANATOMICAL & STRUCTURAL RULES (CRITICAL):**
*   **NO FLOATING HEADS**: Every head must be securely attached to a neck and body.
*   **NO DETACHED LIMBS**: Hands and feet must be connected to arms and legs.
*   **CORRECT PROPORTIONS**: Arms should not be longer than legs. Heads should be proportional to bodies.
*   **FINGER COUNT**: Exactly 5 fingers per hand. No morphed blobs.
*   **GRAVITY**: Characters must stand ON the ground, not float (unless flying).

**🎨 Art Style & Mood (Premium Quality):**
* **Style:** Modern premium Korean webtoon. Utilize sharp, clean digital line art, professional cel-shading, and vibrant, cinematic lighting (e.g., dramatic shadows, glowing effects).
* **Vibe:** Epic, emotional, and dynamic. Apply sophisticated color grading to match the scene's tone.
* **Detail:** High-resolution backgrounds with depth of field, complex character designs, and rich textures.

**📐 Layout & Composition (CRITICAL CONSTRAINTS):**
* **Format:** The final output MUST be a continuous sequence of **long vertical rectangular panels (approx. 800x1280 aspect ratio each)**, stacked strictly from top to bottom.
* **Direction:** **NEVER use horizontal or square panels.** Never place panels side-by-side. The flow is strictly vertical.
* **Spacing:** Use clean, plain WHITE gutters (margins) between panels. No black backgrounds.
* **Framing (Anti-Cropping):** Ensure characters are fully contained within their frames. **DO NOT CROP heads, hands, or feet at the panel edges.** Leave comfortable breathing room around the subjects.

**🚫 Quality & Consistency Rules:**
* **Consistency:** Maintain perfect continuity of character designs (hair, eyes, outfit, gender) across all panels.
* **Anatomy:** Render anatomically accurate figures (2 arms, 2 legs, 5 fingers per hand, etc.). No distortions.
* **Cleanliness:** absolutely NO text, speech bubbles, watermarks, or UI elements. Just pure visuals.
* **Volume:** Expand the input into a rich, multi-panel sequence, creating more panels than described to ensure a full, flowing episode feel.
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
