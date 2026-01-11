import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const image = formData.get('image');
        const prompt = formData.get('prompt') || "korean webtoon style, vibrant colors, clean lines, anime style, high quality";

        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        const { env } = getRequestContext<CloudflareEnv>();

        if (!env.AI) {
            return NextResponse.json({ error: 'AI binding is missing. Check Cloudflare Dashboard.' }, { status: 500 });
        }

        // Convert Buffer/File to ArrayBuffer
        const arrayBuffer = await (image as Blob).arrayBuffer();
        const inputs = {
            image: [...new Uint8Array(arrayBuffer)], // Workers AI expects integer array for image input in some models, or direct bytes
            prompt: prompt,
            strength: 0.5, // 0.0 to 1.0, how much to respect the original image
            guidance: 7.5
        };

        // Use Stable Diffusion Image-to-Image model
        // Note: The specific model ID might need adjustment based on availability
        const response = await env.AI.run(
            "@cf/runwayml/stable-diffusion-v1-5-img2img",
            inputs
        );

        // Response is a ReadableStream (PNG). We should upload it to R2 and return the URL.
        // For now, let's return it as Base64 to display immediately in the frontend.
        const chunks = [];
        const reader = response.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        // Combine chunks (Uint8Arrays)
        const combined = new Uint8Array(chunks.reduce((acc, val) => acc + val.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
        }

        // Convert to Base64
        // Use a more robust way for large buffers if needed, but for images this is usually fine in edge
        let binary = '';
        const len = combined.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(combined[i]);
        }
        const base64 = btoa(binary);

        return NextResponse.json({
            success: true,
            image: `data:image/png;base64,${base64}`
        });

    } catch (error) {
        console.error('AI Processing Error:', error);
        return NextResponse.json({
            error: `AI 변환 실패: ${(error as Error).message}`
        }, { status: 500 });
    }
}
