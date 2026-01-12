import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        // Style prompts mapping (내부 프롬프트 - 사용자에게 노출 안됨)
        // 중요: 배경과 인물 모두 변환되도록 명시
        const STYLE_PROMPTS: Record<string, string> = {
            'watercolor': 'Transform the ENTIRE image including background and all elements into Studio Ghibli anime style. Soft watercolor textures, Hayao Miyazaki aesthetic, dreamy atmosphere, warm lighting. Convert ALL photorealistic elements to hand-painted anime look. The background scenery must also be stylized, not just the people.',
            '3d-cartoon': 'Transform the ENTIRE image including background into Disney 3D animation style. Big expressive eyes, cinematic lighting, Pixar-like soft shading, vibrant colors. Convert ALL elements including environment to cartoon render style, not just characters.',
            'dark-fantasy': 'Transform the ENTIRE image including background into Solo Leveling manhwa style. High contrast, sharp digital line art, dramatic shadows, intense cinematic vibe, Korean webtoon, bold black outlines. The environment and background must also be stylized in manhwa style.',
            'elegant-fantasy': 'Transform the ENTIRE image including background into Korean manhwa webtoon style like Omniscient Reader. Elegant digital painting, bold lines, unique fantasy color palette. Convert ALL elements to illustrated style including scenery.',
            'classic-webtoon': 'Transform the ENTIRE image including background into Korean webtoon manhwa style. Bold black outlines, cel-shading, flat colors. Remove ALL photorealistic textures from people AND environment. Make everything look like a drawn webtoon illustration.'
        };

        const DEFAULT_PROMPT = 'Transform this image into Korean webtoon manhwa style. Use bold black outlines, cel-shading, flat colors with minimal gradients, anime-style eyes and faces. Remove all photorealistic textures. Make it look like a drawn illustration from a professional webtoon comic, NOT a photo filter. Strong cartoon aesthetic.';

        // Read JSON Body
        const body = await request.json() as { image: string, styleId?: string, prompt?: string };
        const image = body.image;
        const styleId = body.styleId || 'classic-webtoon';
        const prompt = STYLE_PROMPTS[styleId] || body.prompt || DEFAULT_PROMPT;

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const { env } = getRequestContext<CloudflareEnv>();
        const apiKey = env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API Key missing' }, { status: 500 });
        }

        // Extract Base64 data from Data URI
        // Input format: "data:image/jpeg;base64,/9j/4AAQ..."
        const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!base64Match) {
            return NextResponse.json({ error: 'Invalid image format. Expected Base64 Data URI.' }, { status: 400 });
        }
        const mimeType = `image/${base64Match[1]}`;
        const base64Data = base64Match[2];

        // Call Gemini API (Nano Banana Pro)
        // Model: gemini-3-pro-image-preview (Nano Banana Pro Image)
        // Endpoint: generateContent with responseModalities: ["IMAGE", "TEXT"]
        // Using gemini-2.5-flash-image (Nano Banana - 500 images/day free tier)
        // Correct model name confirmed from Google docs
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        const geminiRes = await fetch(geminiEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: base64Data
                                }
                            },
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
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

        // Extract generated image from response
        // Response structure: { candidates: [{ content: { parts: [{ inlineData: { data, mimeType } }] } }] }
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
            // Check if there's text explaining why generation failed
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
                        `INSERT INTO generated_images (id, r2_key, prompt) VALUES (?, ?, ?)`
                    ).bind(imageId, r2Key, prompt).run();
                    savedToGallery = true;
                    console.log('Saved to gallery:', imageId);
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
