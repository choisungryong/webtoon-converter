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

        if (dataUri.length < 100) {
            console.error("DEBUG ERROR: Image data too short, likely invalid.");
            return NextResponse.json({ error: 'Image data invalid (too short)' }, { status: 400 });
        }

        // Call Replicate (Start Only)
        // Switch to Stable Diffusion 2.1 for reliable Image-to-Image
        // Old: cjwbw/anything-v4.0 (Likely ignoring input)
        // New: stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf
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
                    prompt: prompt, // "webtoon style..."
                    negative_prompt: negativePrompt,
                    num_inference_steps: 25, // Increase slightly for quality
                    guidance_scale: 7.5,
                    strength: 0.3, // 0.3 is strict but allows some stylization. 0.25 might be too stiff.
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
