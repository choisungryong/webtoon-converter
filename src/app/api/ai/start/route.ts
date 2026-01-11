import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        // Read JSON Body (Client-side Base64)
        const body = await request.json() as { image: string, prompt?: string };
        const image = body.image;
        const prompt = body.prompt || "webtoon style, anime style, cel shaded, vibrant colors";

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const { env } = getRequestContext<CloudflareEnv>();
        const apiToken = env.REPLICATE_API_TOKEN;

        if (!apiToken) {
            return NextResponse.json({ error: 'Replicate API Token missing' }, { status: 500 });
        }

        // Image is already Base64 Data URI from client
        const dataUri = image;

        // Verify Payload Size
        if (!dataUri || dataUri.length < 100) {
            console.error("[AI-START] Critical: Image Data Missing or Too Short!");
            return new Response(JSON.stringify({ error: "Image Data Missing" }), { status: 400 });
        }

        // Call Replicate (Start Only)
        // EMERGENCY ROLLBACK: Use cjwbw/anything-v4.0
        // Reason: Flux models are causing persistent 500 Errors (Version/Schema issues).
        // Goal: Restore Service Availability IMMEDIATELY.
        // Capabilities: Excellent Anime Style + Img2Img.
        const modelVersion = "42a996d39a96aedc57b2e0aa8105dea39c9c89d9d266caf6bb4327a1c191b061";

        const startRes = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: modelVersion,
                input: {
                    // Anything V4 Schema
                    prompt: prompt || "masterpiece, best quality, illustration, beautiful detailed, finely detailed, dramatic light, intricate details, anime style, webtoon style",
                    negative_prompt: "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name",

                    // Img2Img Params
                    original_image: dataUri, // Some models use 'original_image', others 'image'. V4 uses 'image' usually, but let's check.
                    // Actually, Replicate standard is usually 'image' for init_image.
                    // But Anything V4 inputs might differ.
                    // Let's use 'image' (init_image) and 'prompt'.
                    // Note: 'image' in Replicate usually means inputs.
                    // Anything V4 Replicate page says input is 'image' (for img2img) or 'prompt'.
                    image: dataUri,

                    // Tuning
                    strength: 0.65,        // 0.65 = Balanced between Source and Anime Style
                    num_inference_steps: 25,
                    guidance_scale: 7.5,
                    scheduler: "DPMSolverMultistep"
                }
            })
        });

        if (startRes.status !== 201) {
            const errorText = await startRes.text();
            console.error("Replicate Start Error:", errorText);

            return NextResponse.json({ error: `Replicate Error: ${errorText}` }, { status: 500 });
        }

        const prediction = await startRes.json();
        return NextResponse.json({
            success: true,
            predictionId: prediction.id,
            status: prediction.status
        });

    } catch (error) {
        console.error('Start API Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
