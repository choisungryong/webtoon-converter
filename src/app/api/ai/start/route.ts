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

        // Verify Payload Size
        if (!dataUri || dataUri.length < 100) {
            console.error("[AI-START] Critical: Image Data Missing or Too Short!");
            return new Response(JSON.stringify({ error: "Image Data Missing" }), { status: 400 });
        }

        // Call Replicate (Start Only)
        // Model: lucataco/flux-dev-multi-lora (Safe Fallback)
        // Reason: xlabs-ai version was private/deprecated.
        // Capabilities: Img2Img (Colors/Structure) + LoRA (Style).
        // Hash: ad031456...
        const modelVersion = "ad0314563856e714367fdc7244b19b160d25926d305fec270c9e00f64665d352";

        const startRes = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: modelVersion,
                input: {
                    // Flux Multi-LoRA Schema
                    prompt: prompt || "modern anime style, webtoon style, manhwa, vibrant colors, detailed highlights, clean lines, masterpiece, best quality",
                    image: dataUri,           // Img2Img: Preserves both Color and Structure
                    prompt_strength: 0.85,    // High strength for style transfer, but keeps 15% original pixels

                    // Style Injection (LoRA)
                    hf_loras: ["alfredplpl/flux.1-dev-modern-anime-lora"],
                    lora_scales: [1.0],

                    // Standard Flux Params
                    num_inference_steps: 28,
                    guidance_scale: 3.5,
                    output_format: "jpg"
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
