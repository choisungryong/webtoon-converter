import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        console.log('[Premium/Convert] POST Request received');

        const { env } = getRequestContext();
        const body = await request.json() as {
            image: string,
            sourceWebtoonId?: string,
            userId: string
        };

        const { image, sourceWebtoonId, userId } = body;

        if (!image || !userId) {
            return NextResponse.json({ error: 'Missing image or userId' }, { status: 400 });
        }

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
        }

        // Extract Base64 data from Data URI
        const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!base64Match) {
            return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
        }
        const mimeType = `image/${base64Match[1]}`;
        const base64Data = base64Match[2];

        // Premium conversion prompt - Professional Korean Webtoon Episode Style
        const premiumPrompt = `[GENERATE NEW IMAGE - PREMIUM WEBTOON EPISODE]

Transform this image into a PROFESSIONAL Korean webtoon episode page. Create a stunning 800x1280 pixel vertical webtoon page.

CRITICAL REQUIREMENTS:

1. PANEL LAYOUT (Very Important):
   - Divide the scene into 3-5 dramatic comic panels
   - Use dynamic panel shapes (diagonal cuts, overlapping panels, bleeds)
   - Create visual flow that guides the reader's eye naturally
   - Include one large "hero" panel for the most dramatic moment

2. CINEMATIC STYLE:
   - Apply dramatic camera angles (low angle, high angle, close-ups, wide shots)
   - Use depth of field effects (blur backgrounds for focus)
   - Add dramatic lighting with strong contrast
   - Include speed lines, impact effects, or emotion particles where appropriate

3. CHARACTER ENHANCEMENT:
   - Redraw characters in premium manhwa/webtoon art style
   - Add detailed facial expressions showing emotion
   - Include dynamic poses and body language
   - Ensure consistent character design across panels

4. ATMOSPHERE & MOOD:
   - Apply professional color grading (warm/cool tones based on mood)
   - Add atmospheric effects (lens flares, light rays, shadows)
   - Create depth with layered backgrounds
   - Use gradient overlays for cinematic feel

5. PROFESSIONAL POLISH:
   - Clean, crisp line art with varying line weights
   - Smooth gradient shading (Korean webtoon style)
   - High contrast between panels for visual impact
   - Premium print-quality rendering

OUTPUT: A single 800x1280px vertical image that looks like a page from Solo Leveling, Tower of God, or True Beauty - top-tier professional Korean webtoon quality.

DO NOT: Add any text, speech bubbles, sound effects text, watermarks, or signatures.`;

        // Call Gemini 2.5 Flash Image - Premium quality with enhanced settings
        // Note: gemini-3-pro-image is not yet available in v1beta API
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        console.log('[Premium/Convert] Calling Gemini API...');

        const geminiRes = await fetch(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { inlineData: { mimeType, data: base64Data } },
                        { text: premiumPrompt }
                    ]
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
            console.error("[Premium/Convert] Gemini API Error:", geminiRes.status, errorText);

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

        const parts = candidates[0]?.content?.parts || [];
        let generatedImageBase64 = null;
        let generatedMimeType = "image/png";

        for (const part of parts) {
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
                ).bind(imageId, userId, sourceWebtoonId || null, r2Key, 'premium-conversion').run();

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
            saved: !!(env.R2 && env.DB)
        });

    } catch (error) {
        console.error('[Premium/Convert] Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
