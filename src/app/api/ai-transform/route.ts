import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const runtime = 'edge';

// NOTE: Please set REPLICATE_API_TOKEN in Cloudflare Dashboard.
// GitHub Secret Scanning prevents hardcoding tokens in deployed code.

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const image = formData.get('image');
        // Default to a high-quality Anime prompt if none provided
        const prompt = formData.get('prompt') || "masterpiece, best quality, ultra-detailed, anime style, webtoon style, vibrant colors, clean lines, high quality, 2d anime";

        // Negative prompt to avoid bad quality
        const negativePrompt = "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry";

        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        const { env } = getRequestContext<CloudflareEnv>();

        // REQUIREMENT: Valid Replicate API Token in Environment Variables
        const apiToken = env.REPLICATE_API_TOKEN;

        if (!apiToken) {
            return NextResponse.json({ error: 'Replicate API Token is missing. Please add REPLICATE_API_TOKEN to your Cloudflare Pages variables.' }, { status: 500 });
        }

        // 1. Prepare Input Image
        // Replicate accepts a public URL or a data URI.
        // Converting to Data URI (base64) is safest for direct upload without public S3 access.
        const arrayBuffer = await (image as Blob).arrayBuffer();
        const base64 = btoa(
            new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        const mimeType = (image as File).type || 'image/png';
        const dataUri = `data:${mimeType};base64,${base64}`;

        // 2. Call Replicate API (Start Prediction)
        // Model: cjwbw/anything-v4.0 (A popular high-quality Anime model)
        const modelVersion = "42a996d39a96aedc57b2e0aa8105dea39c9c89d9d266caf6bb4327a1c191331d";

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
                    num_inference_steps: 20,
                    guidance_scale: 7.5,
                    scheduler: "DPMSolverMultistep"
                }
            })
        });

        if (startRes.status !== 201) {
            const err = await startRes.text();
            console.error("Replicate API Error:", err);
            throw new Error(`Replicate API Failed: ${err}`);
        }

        const prediction = await startRes.json();
        let predictionId = prediction.id;
        let outputUrl = null;

        // 3. Poll for Completion
        let status = prediction.status;
        while (status !== "succeeded" && status !== "failed" && status !== "canceled") {
            await new Promise(r => setTimeout(r, 1000)); // Wait 1s
            const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: {
                    "Authorization": `Token ${apiToken}`,
                }
            });
            const checkJson = await checkRes.json();
            status = checkJson.status;
            if (status === "succeeded") {
                outputUrl = checkJson.output[0]; // AnythingV4 returns array
            } else if (status === "failed") {
                throw new Error(`Replicate generation failed: ${checkJson.error}`);
            }
        }

        if (!outputUrl) {
            throw new Error("No output output generated");
        }

        // 4. Download Result Image
        const imgRes = await fetch(outputUrl);
        const imgBlob = await imgRes.blob();
        const imgBuffer = await imgBlob.arrayBuffer();

        // 5. Upload to R2 (Persistence)
        const imageId = crypto.randomUUID();
        const r2Key = `generated/${imageId}.png`;

        if (env.R2) {
            await env.R2.put(r2Key, imgBuffer, {
                httpMetadata: { contentType: 'image/png' }
            });

            // 6. Save to D1
            if (env.DB) {
                try {
                    await env.DB.prepare(
                        `INSERT INTO generated_images (id, r2_key, prompt) VALUES (?, ?, ?)`
                    ).bind(imageId, r2Key, prompt.toString()).run();
                } catch (dbError) {
                    console.error('DB Insert Error:', dbError);
                }
            }
        }

        // 7. Return Signed URL (Visual Feedback)
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

        // Fallback if R2 credentials missing (should not happen in prod)
        return NextResponse.json({
            success: true,
            image: outputUrl
        });

    } catch (error) {
        console.error('AI Processing Error:', error);
        return NextResponse.json({
            error: `AI 변환 실패: ${(error as Error).message}`
        }, { status: 500 });
    }
}
