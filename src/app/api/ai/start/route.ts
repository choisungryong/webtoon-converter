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
        // Model: xlabs-ai/flux-dev-controlnet (v3)
        // "Nano Banana" Plan B (Replicate Hard Mode):
        // 1. Img2Img ('image'): Preserves Colors/Identity.
        // 2. ControlNet ('control_image'): Preserves Structure (Canny).
        // 3. LoRA ('lora_url'): Enforces "Modern Anime" Style.
        // Full Hash from Step 2237
        const modelVersion = "f2c31c31d81278a91b2447a304dae654c64a5d5a70320f531d60dbd566f71ed1";

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
                    image: dataUri,           // Color/Identity Base
                    control_image: dataUri,   // Structure Base
                    control_type: "canny",

                    // Style Injection (The "Nano Banana" Secret)
                    lora_url: "https://huggingface.co/alfredplpl/flux.1-dev-modern-anime-lora/resolve/main/flux.1-dev-modern-anime-lora.safetensors",
                    lora_strength: 1.0,       // Full Anime Style

                    // Tuning
                    prompt_strength: 0.85,    // 0.85 = Mostly AI Style, 0.15 Original Colors. (Flux needs high strength to activate LoRA)
                    control_net_strength: 0.60, // Keep pose but allow minor adjustments

                    prompt: prompt || "modern anime style, webtoon style, manhwa, vibrant colors, detailed highlights, clean lines, masterpiece, best quality",
                    num_inference_steps: 28,  // Flux Dev Standard
                    guidance_scale: 3.5,      // Flux Dev Standard
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
