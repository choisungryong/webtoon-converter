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
        // Style prompts mapping (Simplified with Korean Speech Bubbles & Stylized)
        const STYLE_PROMPTS: Record<string, string> = {
            'watercolor': 'Transform this image into Studio Ghibli 2D anime style. Use bright colors, hand-drawn lines, and slightly exaggerated facial expressions. Remove photorealism. Add a speech bubble containing Korean text.',
            '3d-cartoon': 'Transform this image into Disney Pixar 3D cartoon style. Use expressive exaggerated features, big eyes, and smooth cartoon rendering. NOT realistic. Add a speech bubble containing Korean text.',
            'dark-fantasy': 'Transform this image into dark fantasy manhwa style. Sharp lines, high contrast. Add a speech bubble containing Korean text.',
            'elegant-fantasy': 'Transform this image into Korean romance fantasy manhwa style. Use delicate lines, sparkling eyes, and beautiful 2D illustration style. Remove realistic textures. Add a speech bubble containing Korean text.',
            'classic-webtoon': 'Transform this image into classic Korean webtoon style. Bold outlines, flat colors. Add a speech bubble containing Korean text.'
        };

        const DEFAULT_PROMPT = 'Transform this image into Korean webtoon manhwa style. Add a speech bubble containing Korean text.';

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