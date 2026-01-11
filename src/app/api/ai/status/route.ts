import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get('id');
    const prompt = searchParams.get('prompt') || '';

    if (!predictionId) {
        return NextResponse.json({ error: 'Missing predictionId' }, { status: 400 });
    }

    const { env } = getRequestContext<CloudflareEnv>();
    const apiToken = env.REPLICATE_API_TOKEN;

    if (!apiToken) {
        return NextResponse.json({ error: 'Missing API Token' }, { status: 500 });
    }

    try {
        // Check Status
        const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: {
                "Authorization": `Token ${apiToken}`,
            }
        });

        if (!checkRes.ok) {
            return NextResponse.json({ error: 'Failed to check Replicate status' }, { status: 500 });
        }

        const prediction = await checkRes.json();
        const status = prediction.status;

        if (status === 'succeeded') {
            const outputUrl = prediction.output[0];

            // Download & Save logic here (Server-side persistence)
            // We do this here so the client doesn't have to handle R2 logic

            // 1. Download
            const imgRes = await fetch(outputUrl);
            const imgBlob = await imgRes.blob();
            const imgBuffer = await imgBlob.arrayBuffer();

            // 2. Save to R2
            const imageId = crypto.randomUUID();
            const r2Key = `generated/${imageId}.png`;

            if (env.R2) {
                await env.R2.put(r2Key, imgBuffer, {
                    httpMetadata: { contentType: 'image/png' }
                });

                // 3. Save to D1
                if (env.DB) {
                    try {
                        await env.DB.prepare(
                            `INSERT INTO generated_images (id, r2_key, prompt) VALUES (?, ?, ?)`
                        ).bind(imageId, r2Key, prompt).run();
                    } catch (e) {
                        console.error("DB Error:", e);
                    }
                }
            }

            // 4. Generate Signed URL for display
            let finalUrl = outputUrl;
            if (env.R2 && env.R2_BUCKET_NAME) {
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
                finalUrl = await getSignedUrl(S3, getCommand, { expiresIn: 3600 });
            }

            return NextResponse.json({
                status: 'succeeded',
                image: finalUrl
            });

        } else if (status === 'failed' || status === 'canceled') {
            return NextResponse.json({ status: 'failed', error: prediction.error });
        } else {
            // starting, processing
            return NextResponse.json({ status: status });
        }

    } catch (error) {
        console.error("Status Check Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
