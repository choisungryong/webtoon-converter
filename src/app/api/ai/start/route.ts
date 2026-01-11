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
        // Model: rossjillian/controlnet (Multi-ControlModel Wrapper)
        // We use "Canny" mode to extract lines and force composition adherence.
        // Version: Latest Hash (795433b1...)
        const modelVersion = "795433b19458d0f4fa172a7ccf93178d2adb1cb8ab2ad6c8fdc33fdbcd49f477";

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
                    structure: "canny", // REQUIRED: Tells the model to use Canny Edge Detection
                    prompt: prompt || "webtoon style, anime style, manhwa, cel shaded, flat color, clean lines, masterpiece, best quality",
                    negative_prompt: negativePrompt + ", longbody, lowres, bad anatomy, bad hands, missing fingers, pubic hair, extra digit, fewer digits, cropped, worst quality, low quality",

                    // ControlNet Settings
                    image_resolution: 512,
                    low_threshold: 100,
                    high_threshold: 200,
                    steps: 20,          // Rossjillian uses 'steps'
                    scale: 9.0,         // Guidance Scale
                    eta: 0.0,
                    a_prompt: "best quality, extremely detailed" // Added prompt for quality
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
