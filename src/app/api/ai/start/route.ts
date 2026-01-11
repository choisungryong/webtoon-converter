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
        // Model: stability-ai/stable-diffusion (v2.1) - Reliable Img2Img Support
        // We switched back because "Anything v4" was ignoring the input image.
        // We now use SD 2.1 with 512px resolution to prevent "Abstract Art".
        const modelVersion = "db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf";

        const startRes = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: modelVersion,
                input: {
                    image: dataUri,
                    // SD 2.1 uses 'image' but we keep redundancy just in case
                    prompt: prompt || "webtoon style, anime style, manhwa, cel shaded, flat color, bold lines, masterpiece, best quality, faithful to source, preserve exact composition",
                    negative_prompt: negativePrompt + ", 3d, realistic, photo, photorealistic, render, bokeh, blur, error, low quality, bad anatomy, bad hands, text, watermark, grainy, ugly, deformed, distorted, hallucinations",
                    num_inference_steps: 50,
                    guidance_scale: 7.5,
                    strength: 0.30, // 0.30 = Strict Filter Mode (SD 2.1 is sensitive)
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
