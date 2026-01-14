import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get('id');
    const prompt = searchParams.get('prompt') || '';

    if (!predictionId) {
        return NextResponse.json({ error: 'Missing predictionId' }, { status: 400 });
    }

    try {
        const { env } = getRequestContext();
        const apiToken = env.REPLICATE_API_TOKEN;

        if (!apiToken) {
            return NextResponse.json({ error: 'Missing API Token' }, { status: 500 });
        }

        const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
            headers: { "Authorization": `Token ${apiToken}` }
        });

        if (!checkRes.ok) {
            return NextResponse.json({ error: 'Failed to check Replicate status' }, { status: 500 });
        }

        const prediction = await checkRes.json();
        const status = prediction.status;

        if (status === 'succeeded') {
            const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

            const imgRes = await fetch(outputUrl);
            const imgBlob = await imgRes.blob();
            const imgBuffer = await imgBlob.arrayBuffer();

            const imageId = crypto.randomUUID();
            const r2Key = `generated/${imageId}.png`;

            if (env.R2) {
                await env.R2.put(r2Key, imgBuffer, {
                    httpMetadata: { contentType: 'image/png' }
                });

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

            return NextResponse.json({
                status: 'succeeded',
                image: `/api/gallery/${imageId}/image`,
                imageId: imageId
            });

        } else if (status === 'failed' || status === 'canceled') {
            return NextResponse.json({ status: 'failed', error: prediction.error });
        } else {
            return NextResponse.json({ status: status });
        }

    } catch (error) {
        console.error("Status Check Error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
