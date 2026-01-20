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

⚠️ CRITICAL - CHARACTER IDENTITY PRESERVATION (MOST IMPORTANT):
- PRESERVE EXACT GENDER: If female, MUST remain female. If male, MUST remain male.
- PRESERVE EXACT APPEARANCE: Same face shape, hairstyle, hair color, eye color
- PRESERVE CLOTHING: Same outfit colors and style
- PRESERVE NUMBER OF PEOPLE: If 2 people shown, draw exactly 2 people
- DO NOT change any character's identity, gender, or distinguishing features

REQUIREMENTS:

1. PANEL LAYOUT:
   - Create 2-4 panels showing different angles of the SAME scene
   - Use dynamic panel shapes (diagonal cuts, overlapping)
   - One large "hero" panel featuring the main moment

2. CINEMATIC STYLE:
   - Dramatic camera angles (close-up, medium shot, wide shot)
   - Depth of field effects
   - Strong lighting contrast
   - Speed lines or emotion particles where appropriate

3. CHARACTER ENHANCEMENT (while preserving identity):
   - Enhance to premium manhwa art style
   - Add detailed expressions
   - KEEP same gender, face, hair, outfit
   - Consistent design across ALL panels

4. ATMOSPHERE:
   - Professional color grading
   - Atmospheric lighting effects
   - Layered backgrounds with depth

OUTPUT: Single 800x1280px vertical webtoon page.

STRICT RULES:
- NO text, speech bubbles, watermarks
- NO changing character gender or appearance
- SAME characters must appear consistently across panels`;

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
