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
        // Enhanced with strict anatomical accuracy and anti-cropping rules
        // UPDATED: Removed fixed 3000px height limit, generate 2-3 panels per input scene
        const premiumPrompt = `[GENERATE NEW IMAGE - PREMIUM WEBTOON EPISODE]

🚨 CRITICAL INSTRUCTION - READ CAREFULLY:
This input is a COMPOSITE image with MULTIPLE SCENES stacked vertically.
You MUST create MORE panels than the number of input scenes.

📐 MANDATORY PANEL MULTIPLICATION RULE:
- Count the number of distinct scenes in the input image
- For EACH input scene, you MUST create EXACTLY 2-3 NEW panels
- MINIMUM OUTPUT: (input scenes × 2) panels
- Example: 6 input scenes → MINIMUM 12 panels, ideally 15-18 panels
- Example: 4 input scenes → MINIMUM 8 panels, ideally 10-12 panels
- If you only produce the SAME number of panels as input scenes, YOU HAVE FAILED

📏 EACH PANEL SIZE (MANDATORY - VERTICAL FORMAT):
- EVERY panel must be 800 pixels wide × 1280 pixels tall (16:10 vertical ratio)
- NEVER create horizontal/landscape panels
- NEVER create square panels
- ALL panels must be TALL VERTICAL rectangles
- This is WEBTOON format - always vertical, never horizontal

🎬 PANEL VARIETY FOR EACH SCENE:
For each input scene, create these variations:
1. CLOSE-UP: Face/expression focus (emotional impact) - 800x1280
2. MEDIUM SHOT: Upper body interaction (dialogue feel) - 800x1280
3. WIDE/FULL SHOT: Establishing context (optional 3rd panel) - 800x1280

🚫 ABSOLUTE NO-CROPPING RULE (CRITICAL):
- NEVER cut off any character at panel edges
- Every character must be FULLY VISIBLE from head to toe
- If a character appears in a panel, their ENTIRE BODY must be shown
- NO partial bodies, NO cut-off heads, NO missing legs/feet
- Leave 10% margin at all edges
- If you cannot fit the full body, ZOOM OUT instead of cropping

🚫 ANATOMICAL RULES (NEVER VIOLATE):
- EXACTLY 2 arms, 2 legs, 2 hands (5 fingers each), 2 feet per person
- Normal human proportions - NO elongated/distorted body parts
- NO extra limbs, NO missing limbs, NO merged body parts

⚠️ CHARACTER IDENTITY:
- Preserve gender, face, hair color, outfit exactly
- Same number of people in each scene
- Consistent character appearance across ALL panels

STYLE:
- Premium Korean manhwa/webtoon art style
- Dynamic panel layouts (diagonal cuts, varied sizes within panel)
- Cinematic angles and lighting
- Professional color grading

OUTPUT SPECIFICATION:
- Total Width: 800 pixels
- Each Panel: 800 × 1280 pixels (VERTICAL)
- Total Height: (number of panels) × 1280 pixels
- All panels stacked vertically for seamless scroll reading
- Example: 12 panels → 800 × 15360 pixels total

FINAL CHECK BEFORE OUTPUT:
✓ Did I create at least 2x the number of input scenes as panels?
✓ Is EVERY panel 800×1280 (vertical, not horizontal)?
✓ Is every character fully visible in every panel (no cropping)?
✓ Are all body parts correct (2 arms, 2 legs per person)?

DO NOT: Add text, speech bubbles, watermarks, horizontal panels`;


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
