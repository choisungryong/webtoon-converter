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

        // Premium conversion prompt
        const premiumPrompt = `[GENERATE NEW IMAGE] Transform this webtoon image into a premium, cinematic Korean webtoon episode.

REQUIREMENTS:
1. OUTPUT SIZE: Create a high-quality 800x1280 pixel vertical image
2. STYLE: Premium Korean webtoon episode aesthetic with:
   - Enhanced dramatic lighting and shadows
   - Refined character art with detailed expressions
   - Rich color grading with cinematic atmosphere
   - Professional panel composition
3. PRESERVE: Keep all characters, poses, and story elements from the original
4. ENHANCE: Add depth, polish, and professional webtoon quality

OUTPUT: A single, premium quality webtoon episode image (800x1280px) that looks like it's from a top-tier professional Korean webtoon series.

DO NOT: Add text, speech bubbles, watermarks, or change the story content.`;

        // Call Gemini 3 Pro Image (Nano Banana Pro) - Premium model with 4K support
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent?key=${apiKey}`;

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
