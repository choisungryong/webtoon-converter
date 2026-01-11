import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        // Read JSON Body (Client-side Base64)
        const body = await request.json() as { image: string, prompt?: string };
        const image = body.image;
        const prompt = body.prompt || "webtoon style, anime style, cel shaded, vibrant colors";
        const negativePrompt = "nsfw, nude, naked, porn, text, bad anatomy, error, cropped, worst quality, low quality, jpeg artifacts, signature, watermark, username, blurry";

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

        console.log("DEBUG: Received Image Payload");
        console.log("DEBUG: Image Length:", dataUri ? dataUri.length : "NULL");
        console.log("DEBUG: Image Prefix:", dataUri ? dataUri.substring(0, 50) : "NULL");

        // Verify Payload Size
        console.log(`[AI-START] Payload Length: ${dataUri?.length || 0} chars`);
        if (!dataUri || dataUri.length < 100) {
            console.error("[AI-START] Critical: Image Data Missing or Too Short!");
            return new Response(JSON.stringify({ error: "Image Data Missing" }), { status: 400 });
        }

        // Call Replicate (Start Only)
        // Model: lucataco/sdxl-controlnet (SDXL + ControlNet + Img2Img)
        // Hybrid Approach: 
        // 1. Img2Img ('image'): Preserves Colors, Lighting, Identity (Asian family, Red vests).
        // 2. ControlNet ('controlnet_1_image'): Preserves Composition/Edges (Canny).
        // Resolution: The 'Incomplete' Flux approach caused 'Race Swapping' because it ignored pixel data.
        const modelVersion = "06d6fae3b75ab68a28cd2900afa6033166910dd09fd9751047043a5bbb4c184b";

        const startRes = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: modelVersion,
                input: {
                    // Hybrid Inputs
                    image: dataUri,           // Source for Color/Lighting (Img2Img)
                    controlnet_1_image: dataUri, // Source for Lines/Structure (ControlNet)
                    controlnet_1: "canny",

                    // Tuning
                    prompt_strength: 0.75,     // 0.75 = Heavy styling but keep original colors. (1.0 = Ignore Image)
                    controlnet_1_conditioning_scale: 0.6, // Moderate structural guidance

                    prompt: prompt || "webtoon style, anime style, manhwa, vibrant colors, flat shading, clean thick lines, detailed background, masterpiece, best quality",
                    negative_prompt: negativePrompt + ", 3d, realistic, photo, photorealistic, noise, grainy, ugly, deformed, bad anatomy",
                    num_inference_steps: 40,
                    refine: "expert_ensemble_refiner", // Improves faces/details
                    apply_watermark: false
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
