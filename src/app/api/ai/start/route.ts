import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const image = formData.get('image');
        const prompt = formData.get('prompt') || "webtoon style, anime style, cel shaded, vibrant colors"; // Minimal prompt to avoid hallucinations
        const negativePrompt = "nsfw, nude, naked, porn, text, bad anatomy, error, cropped, worst quality, low quality, jpeg artifacts, signature, watermark, username, blurry";

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const { env } = getRequestContext<CloudflareEnv>();
        const apiToken = env.REPLICATE_API_TOKEN;

        if (!apiToken) {
            return NextResponse.json({ error: 'Replicate API Token missing' }, { status: 500 });
        }

        // Prepare Image
        const arrayBuffer = await (image as Blob).arrayBuffer();
        const base64 = btoa(
            new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        const mimeType = (image as File).type || 'image/png';
        const dataUri = `data:${mimeType};base64,${base64}`;

        // Call Replicate (Start Only)
        // Model: cjwbw/anything-v4.0
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
                    image: dataUri,
                    prompt: prompt,
                    negative_prompt: negativePrompt,
                    num_inference_steps: 12, // Faster generation (efficient for low strength)
                    guidance_scale: 7.5,
                    strength: 0.25, // Strong structure preservation
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
