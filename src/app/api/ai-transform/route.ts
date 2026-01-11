import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
            image: [...new Uint8Array(arrayBuffer)], // Workers AI expects integer array for image input
            prompt: prompt,
            strength: 0.5,
            guidance: 7.5
        };

        // Use Stable Diffusion Image-to-Image model
        const response = await env.AI.run(
            "@cf/runwayml/stable-diffusion-v1-5-img2img",
            inputs
        );

        // Response is a ReadableStream. Convert to ArrayBuffer for R2 upload.
        const reader = response.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        const combined = new Uint8Array(chunks.reduce((acc, val) => acc + val.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
        }

        // 1. Upload to R2
        const imageId = crypto.randomUUID();
        const r2Key = `generated/${imageId}.png`;

        // R2 binding must be present (handled in env.d.ts but should verify)
        if (env.R2) {
            await env.R2.put(r2Key, combined, {
                httpMetadata: { contentType: 'image/png' }
            });

            // 2. Save to D1
            if (env.DB) {
                try {
                    await env.DB.prepare(
                        `INSERT INTO generated_images (id, r2_key, prompt) VALUES (?, ?, ?)`
                    ).bind(imageId, r2Key, prompt.toString()).run();
                } catch (dbError) {
                    console.error('DB Insert Error:', dbError);
                }
            }
        } else {
            console.warn("R2 binding missing, skipping persistence");
        }

        // 3. Return R2 Signed URL
        // We need AWS SDK variables for signing
        if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME) {
            const S3 = new S3Client({
                region: 'auto',
                endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: env.R2_ACCESS_KEY_ID,
                    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
                },
            });

            const getCommand = new GetObjectCommand({
                Bucket: env.R2_BUCKET_NAME,
                Key: r2Key,
            });

            const signedUrl = await getSignedUrl(S3, getCommand, { expiresIn: 3600 });

            return NextResponse.json({
                success: true,
                image: signedUrl,
                imageId: imageId
            });
        }

        // Fallback if credentials missing: return base64 (old behavior)
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
