import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    return NextResponse.json({
        status: 'alive',
        message: 'Gemini API Worker is Running (Official Adapter)!',
        timestamp: new Date().toISOString()
    });
}

export async function POST(request: NextRequest) {
    try {
        console.log('[API/Start] POST Request received');

        // Style prompts mapping (내부 프롬프트 - 사용자에게 노출 안됨)
        // Style prompts mapping (Full Scene Transformation - NO TEXT/SPEECH BUBBLES)
        const STYLE_PROMPTS: Record<string, string> = {
            'watercolor': 'REDRAW this photo as a HAND-PAINTED Studio Ghibli anime illustration. This is NOT a photo filter - you must CREATE a new hand-drawn artwork. Draw all people as 2D anime characters with large expressive eyes and simplified features. Paint the entire background with visible brushstrokes and watercolor textures. Every element must look DRAWN and PAINTED, not photographed. Use soft pastel colors typical of Ghibli films. The result should be indistinguishable from a frame of a Ghibli animated movie. Do NOT preserve any photorealistic details. Do NOT add text or speech bubbles.',

            '3d-cartoon': 'RECREATE this photo as a Disney Pixar 3D ANIMATED movie scene. This is NOT a photo filter - you must CREATE a new CGI artwork. Make all people into stylized 3D cartoon characters with exaggerated features, big round eyes, and smooth plastic-like skin. Convert all objects into simplified 3D cartoon models. The entire scene must look like a rendered frame from Toy Story or Coco. Use vibrant saturated colors and soft CGI lighting. Do NOT preserve any photorealistic details. Do NOT add text or speech bubbles.',

            'dark-fantasy': 'REDRAW this photo as a HAND-DRAWN dark fantasy Korean manhwa illustration. This is NOT a photo filter - you must CREATE a new drawn artwork. Draw all people as manhwa characters with sharp angular features and dramatic expressions. Apply bold black ink outlines to everything. Use high contrast dramatic lighting with deep shadows. The entire scene must look like a panel from Solo Leveling or similar manhwa. Every element must be DRAWN with visible linework. Do NOT preserve any photorealistic details. Do NOT add text or speech bubbles.',

            'elegant-fantasy': 'REDRAW this photo as a HAND-DRAWN Korean romance fantasy webtoon illustration. This is NOT a photo filter - you must CREATE a new illustrated artwork. Draw all people as beautiful manhwa characters with detailed sparkling eyes and flowing hair. Apply delicate linework and soft shading to everything. Add subtle sparkle and glow effects. The entire scene must look like a panel from a premium romance webtoon. Every element must be DRAWN and ILLUSTRATED. Do NOT preserve any photorealistic details. Do NOT add text or speech bubbles.',

            'classic-webtoon': 'REDRAW this photo as a HAND-DRAWN Korean webtoon comic panel. This is NOT a photo filter - you must CREATE a new comic illustration. Draw all people as webtoon characters with expressive cartoon faces. Apply bold black outlines and flat cell-shaded colors to EVERYTHING - people, clothes, objects, and background. Simplify all details into clean comic art style. The result must look exactly like a panel from a Korean webtoon comic. Every element must have visible DRAWN outlines. Do NOT preserve any photorealistic details. Do NOT add text or speech bubbles.'
        };

        const DEFAULT_PROMPT = 'REDRAW this photo as a HAND-DRAWN Korean webtoon comic illustration. CREATE a new comic artwork with bold outlines and flat colors. Draw all people as cartoon characters. Every element must be DRAWN, not photographed. Do NOT add text or speech bubbles.';

        // Read JSON Body
        const body = await request.json() as { image: string, styleId?: string, prompt?: string, userId?: string };
        const image = body.image;
        const styleId = body.styleId || 'classic-webtoon';
        const userId = body.userId || 'anonymous';
        const prompt = STYLE_PROMPTS[styleId] || body.prompt || DEFAULT_PROMPT;

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const { env } = getRequestContext();

        // Debug Logging
        console.log('[API/Start] Environment Check:', {
            hasEnv: !!env,
            hasGeminiKey: !!env?.GEMINI_API_KEY,
            keyPrefix: env?.GEMINI_API_KEY ? env.GEMINI_API_KEY.substring(0, 4) + '...' : 'NONE',
            styleId,
            userId
        });

        const apiKey = env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('[API/Start] Critical Error: GEMINI_API_KEY is missing in env!');
            return NextResponse.json({
                error: 'Server Configuration Error: API Key missing',
                debug: { hasEnv: !!env, keys: Object.keys(env || {}) }
            }, { status: 500 });
        }

        // Daily Usage Limit Check (30 images/day per user)
        const DAILY_LIMIT = 30;
        if (env.DB && userId !== 'anonymous') {
            try {
                // Get start of today (UTC)
                const now = Math.floor(Date.now() / 1000);
                const todayStart = now - (now % 86400);

                const usageResult = await env.DB.prepare(
                    `SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND created_at >= ?`
                ).bind(userId, todayStart).first() as { count: number } | null;

                const usedCount = usageResult?.count || 0;
                console.log('[API/Start] Daily Usage Check:', { userId, usedCount, limit: DAILY_LIMIT });

                if (usedCount >= DAILY_LIMIT) {
                    return NextResponse.json({
                        error: 'DAILY_LIMIT_EXCEEDED',
                        message: `오늘의 무료 변환 한도(${DAILY_LIMIT}장)를 초과했습니다. 내일 다시 이용해주세요!`,
                        limit: DAILY_LIMIT,
                        used: usedCount
                    }, { status: 429 });
                }
            } catch (dbError) {
                console.error('[API/Start] Usage check failed:', dbError);
                // Continue even if usage check fails
            }
        }

        // Extract Base64 data from Data URI
        const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!base64Match) {
            return NextResponse.json({ error: 'Invalid image format. Expected Base64 Data URI.' }, { status: 400 });
        }
        const mimeType = `image/${base64Match[1]}`;
        const base64Data = base64Match[2];

        // Call Gemini API
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        const geminiRes = await fetch(geminiEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { inlineData: { mimeType: mimeType, data: base64Data } },
                        { text: prompt }
                    ]
                }],
                generationConfig: {
                    responseModalities: ["IMAGE", "TEXT"],
                    temperature: 1.0,
                    topP: 0.95,
                    topK: 40
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
            console.error("Gemini API Error:", geminiRes.status, errorText);

            // Check for quota/rate limit errors
            if (geminiRes.status === 429 ||
                errorText.toLowerCase().includes('quota') ||
                errorText.toLowerCase().includes('limit') ||
                errorText.toLowerCase().includes('rate')) {
                return NextResponse.json({
                    error: 'QUOTA_EXCEEDED',
                    message: '서비스 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
                    details: errorText
                }, { status: 429 });
            }

            return NextResponse.json({ error: `Gemini Error: ${errorText}` }, { status: 500 });
        }

        const geminiData = await geminiRes.json();
        const candidates = geminiData.candidates;

        if (!candidates || candidates.length === 0) {
            return NextResponse.json({ error: 'No image generated by Gemini' }, { status: 500 });
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
            const textPart = parts.find((p: { text?: string }) => p.text);
            const errorMessage = textPart?.text || 'Gemini did not return an image';
            return NextResponse.json({ error: errorMessage }, { status: 500 });
        }

        // Save to R2 for persistence (Gallery Feature) - REMOVED TO PREVENT DUPLICATE SAVES
        // The frontend now handles saving explicitly via /api/gallery
        const imageId = crypto.randomUUID();
        // const r2Key = `generated/${imageId}.png`; // Disabled
        let savedToGallery = false;

        /* Auto-save disabled to prevent duplicates (Original vs Edited)
        if (env.R2) {
            try {
                // ... (R2 and DB logic removed)
            } catch (saveError) {
                console.error('Failed to save to gallery:', saveError);
            }
        }
        */

        // Log successful conversion for usage tracking
        if (env.DB && userId !== 'anonymous') {
            try {
                await env.DB.prepare(
                    `INSERT INTO usage_logs (id, user_id, action) VALUES (?, ?, 'convert')`
                ).bind(crypto.randomUUID(), userId).run();
                console.log('[API/Start] Usage logged for user:', userId);
            } catch (logError) {
                console.error('[API/Start] Failed to log usage:', logError);
                // Continue even if logging fails
            }
        }

        // Return generated image as Data URI
        const outputDataUri = `data:${generatedMimeType};base64,${generatedImageBase64}`;

        return NextResponse.json({
            success: true,
            image: outputDataUri,
            imageId: imageId,
            savedToGallery: savedToGallery,
            status: 'completed'
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}