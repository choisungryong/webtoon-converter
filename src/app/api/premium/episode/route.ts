import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        console.log('[Premium/Episode] POST Request received');

        const { env } = getRequestContext();
        const body = await request.json() as {
            images: string[],  // Array of base64 images
            userId: string
        };

        const { images, userId } = body;

        if (!images || images.length === 0 || !userId) {
            return NextResponse.json({ error: 'Missing images or userId' }, { status: 400 });
        }

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
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
                    data: base64Match[2]
                }
            });
        }

        if (imageParts.length === 0) {
            return NextResponse.json({ error: 'No valid images provided' }, { status: 400 });
        }

        const panelCount = Math.max(imageParts.length, 10); // At least 10 panels or number of images

        // Multi-image Episode Generation Prompt - STRONG ART STYLE CONVERSION
        const episodePrompt = `[CRITICAL: DRAW AS ILLUSTRATED WEBTOON - NOT PHOTOS]

You are an expert Korean webtoon artist. I am giving you ${imageParts.length} REFERENCE PHOTOS. 
You MUST REDRAW these as HAND-DRAWN ILLUSTRATIONS in Korean webtoon/manhwa art style.

⚠️ MOST IMPORTANT - DO NOT USE THE ORIGINAL PHOTOS:
- DO NOT paste or composite the original photos
- DO NOT apply filters to the photos
- You MUST DRAW/ILLUSTRATE everything from scratch
- The output must look like a HAND-DRAWN COMIC, not photographs

🎨 ART STYLE REQUIREMENTS (MANDATORY):
- Korean webtoon/manhwa illustration style (like Solo Leveling, True Beauty, Lookism)
- Clean lineart with smooth cel-shading
- Anime-style eyes and facial features
- Stylized proportions (larger eyes, defined jawlines)
- Vibrant colors with gradient shading
- The result should look like a DRAWING, not a photo

👤 CHARACTER CONVERSION:
- Study each person in the reference photos
- REDRAW them as illustrated manhwa characters
- Keep their gender, hair color, outfit colors the same
- But convert to illustrated/drawn appearance
- Make them look like anime/webtoon characters

📐 LAYOUT (${panelCount} PANELS):
- Create a SINGLE TALL VERTICAL IMAGE (800 x 2400 pixels)
- Arrange ${panelCount} panels vertically for webtoon scroll format
- Use dynamic panel shapes (diagonal cuts, overlapping)
- Mix: 2-3 large dramatic panels + smaller reaction panels

📖 STORYTELLING:
- Each panel shows a different moment from the reference scenes
- Use varied camera angles: close-ups, medium shots, wide shots
- Add speed lines, emotion effects, screen tones where appropriate
- Create visual flow like reading a professional webtoon

OUTPUT: Single 800x2400 pixel illustrated webtoon episode page.

STRICT RULES:
- ILLUSTRATED DRAWING STYLE ONLY - NO PHOTOGRAPHS
- NO text, speech bubbles, or watermarks
- Consistent character appearance across all panels
- Must look like professional Korean webtoon art`;


        // Build request parts: all images + prompt
        const parts: any[] = [
            ...imageParts,
            { text: episodePrompt }
        ];

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        console.log(`[Premium/Episode] Calling Gemini API with ${imageParts.length} images...`);

        const geminiRes = await fetch(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: parts
                }],
                generationConfig: {
                    responseModalities: ["IMAGE", "TEXT"],
                    temperature: 1.0
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        if (!geminiRes.ok) {
            const errorText = await geminiRes.text();
            console.error("[Premium/Episode] Gemini API Error:", geminiRes.status, errorText);

            if (geminiRes.status === 429) {
                return NextResponse.json({
                    error: 'QUOTA_EXCEEDED',
                    message: 'API 한도에 도달했습니다. 잠시 후 다시 시도해주세요.'
                }, { status: 429 });
            }

            return NextResponse.json({ error: `Gemini Error: ${errorText}` }, { status: 500 });
        }

        const geminiData = await geminiRes.json();
        const candidates = geminiData.candidates;

        if (!candidates || candidates.length === 0) {
            return NextResponse.json({ error: 'No image generated' }, { status: 500 });
        }

        const responseParts = candidates[0]?.content?.parts || [];
        let generatedImageBase64 = null;
        let generatedMimeType = "image/png";

        for (const part of responseParts) {
            if (part.inlineData) {
                generatedImageBase64 = part.inlineData.data;
                generatedMimeType = part.inlineData.mimeType || "image/png";
                break;
            }
        }

        if (!generatedImageBase64) {
            return NextResponse.json({ error: 'Gemini did not return an image' }, { status: 500 });
        }

        // Save to R2 and DB
        const imageId = crypto.randomUUID();
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
                    httpMetadata: { contentType: generatedMimeType }
                });

                // Save to DB
                await env.DB.prepare(
                    `INSERT INTO premium_webtoons (id, user_id, source_webtoon_id, r2_key, prompt) VALUES (?, ?, ?, ?, ?)`
                ).bind(imageId, userId, null, r2Key, `episode-${imageParts.length}-images`).run();

                console.log('[Premium/Episode] Saved to R2 and DB:', imageId);
            } catch (saveError) {
                console.error('[Premium/Episode] Save error:', saveError);
            }
        }

        // Return generated image
        const outputDataUri = `data:${generatedMimeType};base64,${generatedImageBase64}`;

        return NextResponse.json({
            success: true,
            image: outputDataUri,
            imageId: imageId,
            panelCount: panelCount,
            saved: !!(env.R2 && env.DB)
        });

    } catch (error) {
        console.error('[Premium/Episode] Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
