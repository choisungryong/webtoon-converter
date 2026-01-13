import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    // === DEBUG: 모듈 로드 에러까지 잡기 위한 동적 import ===
    let getRequestContext: any;
    try {
        const cfModule = await import('@cloudflare/next-on-pages');
        getRequestContext = cfModule.getRequestContext;
    } catch (importError) {
        return NextResponse.json({
            error: 'DEBUG: Failed to import @cloudflare/next-on-pages',
            message: (importError as Error).message,
            debug: true
        }, { status: 500 });
    }

    // === DEBUG: 환경변수 체크 ===
    try {
        const ctx = getRequestContext() as { env: CloudflareEnv };
        if (!ctx) {
            return NextResponse.json({
                error: 'DEBUG: getRequestContext() returned null/undefined',
                debug: true
            }, { status: 500 });
        }
        if (!ctx.env) {
            return NextResponse.json({
                error: 'DEBUG: ctx.env is null/undefined',
                debug: true
            }, { status: 500 });
        }
        const envKeys = Object.keys(ctx.env);
        if (!ctx.env.GEMINI_API_KEY) {
            return NextResponse.json({
                error: 'DEBUG: GEMINI_API_KEY not found in env',
                availableKeys: envKeys,
                debug: true
            }, { status: 500 });
        }
    } catch (debugError) {
        return NextResponse.json({
            error: 'DEBUG: Error in getRequestContext',
            message: (debugError as Error).message,
            debug: true
        }, { status: 500 });
    }
    // === DEBUG 끝 ===

    try {
        // Style prompts mapping (내부 프롬프트 - 사용자에게 노출 안됨)
        const STYLE_PROMPTS: Record<string, string> = {
            'watercolor': 'Transform the ENTIRE image including background and all elements into Studio Ghibli anime style. Soft watercolor textures, Hayao Miyazaki aesthetic, dreamy atmosphere, warm lighting. Convert ALL photorealistic elements to hand-painted anime look. The background scenery must also be stylized, not just the people.',
            '3d-cartoon': 'Transform the ENTIRE image including background into Disney 3D animation style. Cinematic lighting, Pixar-like soft shading, vibrant colors. Keep eye size natural and balanced, avoid overly large eyes. Balanced facial proportions. Convert ALL elements including environment to cartoon render style, not just characters.',
            'dark-fantasy': 'Transform the ENTIRE image including background into Solo Leveling manhwa style. High contrast, sharp digital line art, dramatic shadows, intense cinematic vibe, Korean webtoon, bold black outlines. The environment and background must also be stylized in manhwa style.',
            'elegant-fantasy': 'Transform the ENTIRE image including background into Korean manhwa webtoon style like Omniscient Reader. Elegant digital painting, bold lines, unique fantasy color palette. Convert ALL elements to illustrated style including scenery.',
            'classic-webtoon': 'Transform the ENTIRE image including background into Korean webtoon manhwa style. Bold black outlines, cel-shading, flat colors. Remove ALL photorealistic textures from people AND environment. Make everything look like a drawn webtoon illustration.'
        };

        const DEFAULT_PROMPT = 'Transform this image into Korean webtoon manhwa style. Use bold black outlines, cel-shading, flat colors with minimal gradients, anime-style eyes and faces. Remove all photorealistic textures. Make it look like a drawn illustration from a professional webtoon comic, NOT a photo filter. Strong cartoon aesthetic.';

        // Read JSON Body
        const body = await request.json() as { image: string, styleId?: string, prompt?: string, userId?: string };
        const image = body.image;
        const styleId = body.styleId || 'classic-webtoon';
        const userId = body.userId || 'anonymous';
        const prompt = STYLE_PROMPTS[styleId] || body.prompt || DEFAULT_PROMPT;

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const { env } = getRequestContext() as { env: CloudflareEnv };

        // 🔑 중요 수정: Cloudflare 환경 변수뿐만 아니라 로컬 환경 변수(process.env)도 체크하도록 변경
        // 🔑 Cloudflare 환경 변수 사용 (Standard)
        const apiKey = env.GEMINI_API_KEY;

        console.log('[API/Start] Request received. Style:', styleId, 'User:', userId);

        if (!apiKey) {
            console.error('[API/Start] Error: Gemini API Key is missing in both env and process.env');
            return NextResponse.json({ error: 'Gemini API Key missing. Please set GEMINI_API_KEY in .env.local' }, { status: 500 });
        }

        // Extract Base64 data from Data URI
        const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!base64Match) {
            return NextResponse.json({ error: 'Invalid image format. Expected Base64 Data URI.' }, { status: 400 });
        }
        const mimeType = `image/${base64Match[1]}`;
        const base64Data = base64Match[2];

        // Call Gemini API (Nano Banana Pro)
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
            console.error("Gemini API Error:", errorText);
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

        // Save to R2 for persistence (Gallery Feature)
        const imageId = crypto.randomUUID();
        const r2Key = `generated/${imageId}.png`;
        let savedToGallery = false;

        if (env.R2) {
            try {
                // Convert Base64 to ArrayBuffer
                const binaryString = atob(generatedImageBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                await env.R2.put(r2Key, bytes, {
                    httpMetadata: { contentType: generatedMimeType }
                });

                // Save to D1 database
                if (env.DB) {
                    await env.DB.prepare(
                        `INSERT INTO generated_images (id, r2_key, prompt, user_id) VALUES (?, ?, ?, ?)`
                    ).bind(imageId, r2Key, prompt, userId).run();
                    savedToGallery = true;
                    console.log('Saved to gallery:', imageId, 'User:', userId);
                }
            } catch (saveError) {
                console.error('Failed to save to gallery:', saveError);
                // Continue - image generation succeeded, just gallery save failed
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