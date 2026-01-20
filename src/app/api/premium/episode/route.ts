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

        // Multi-image Episode Generation Prompt
        const episodePrompt = `[GENERATE WEBTOON EPISODE - MULTI-PANEL PAGE]

You are given ${imageParts.length} reference images from a video. Transform these into a SINGLE LONG VERTICAL WEBTOON EPISODE PAGE with ${panelCount} PANELS.

⚠️ CRITICAL - CHARACTER IDENTITY PRESERVATION (MOST IMPORTANT):
- PRESERVE EXACT GENDER for all characters across all panels
- PRESERVE EXACT APPEARANCE: Same face, hairstyle, hair color, eye color
- PRESERVE CLOTHING: Same outfits throughout the episode
- MAINTAIN CONSISTENCY: Same characters must look identical in every panel
- DO NOT change any character's gender or distinguishing features

REQUIREMENTS:

1. PANEL LAYOUT (${panelCount} PANELS):
   - Create exactly ${panelCount} panels arranged vertically
   - Use dynamic panel shapes (diagonal cuts, overlapping, varied sizes)
   - Mix panel types: 2-3 LARGE hero panels, rest medium/small
   - Flow naturally from top to bottom like reading a webtoon

2. STORYTELLING:
   - Each panel should show a different moment or angle from the reference images
   - Create visual narrative flow between panels
   - Use establishing shots, close-ups, reaction shots, action shots
   - Add dramatic camera angles for key moments

3. CINEMATIC STYLE:
   - Depth of field effects
   - Strong lighting contrast with dramatic shadows
   - Speed lines or emotion particles where appropriate
   - Atmospheric effects (light rays, particles, bokeh)

4. ART STYLE:
   - Premium Korean manhwa/webtoon art style
   - Detailed character expressions
   - Layered backgrounds with depth
   - Professional color grading

OUTPUT DIMENSIONS: 800 x 2400 pixels (tall vertical format for ${panelCount} panels)

STRICT RULES:
- NO text, speech bubbles, watermarks, or UI elements
- NO changing character gender or appearance between panels
- SAME characters must appear consistently across ALL panels
- Create a cohesive visual story from the reference images`;

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
