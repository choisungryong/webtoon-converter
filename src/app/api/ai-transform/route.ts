import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const runtime = 'edge';

// NOTE: Please set REPLICATE_API_TOKEN in Cloudflare Dashboard.
// GitHub Secret Scanning prevents hardcoding tokens in deployed code.

export async function POST(request: NextRequest) {
    try {
        // Log start
        console.log("Starting AI Transform Request");

        const formData = await request.formData();
        const image = formData.get('image');
        const prompt = formData.get('prompt') || "masterpiece, best quality, ultra-detailed, anime style, webtoon style, vibrant colors, clean lines, high quality, 2d anime";
        const negativePrompt = "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry";

        if (!image) {
            console.error("Missing image");
            return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
        }

        const { env } = getRequestContext<CloudflareEnv>();
        const apiToken = env.REPLICATE_API_TOKEN;

        if (!apiToken) {
            console.error("Missing Replicate Token");
            return NextResponse.json({ error: 'Replicate API 토큰이 설정되지 않았습니다. Cloudflare 설정을 확인해주세요.' }, { status: 500 });
        }

        // 1. Prepare Input Image
        console.log("Reading image data...");
        const arrayBuffer = await (image as Blob).arrayBuffer();
        const base64 = btoa(
            new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        const mimeType = (image as File).type || 'image/png';
        const dataUri = `data:${mimeType};base64,${base64}`;

        console.log("Calling Replicate API...");

        // 2. Call Replicate API (Start Prediction)
        // Model: cjwbw/anything-v4.0
        // Version: 42a996d39a96aedc57b2e0aa8105dea39c9c89d9d266caf6bb4327a1c191b061
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
                    num_inference_steps: 20,
                    guidance_scale: 7.5,
                    scheduler: "DPMSolverMultistep"
                }
            })
        });

        if (startRes.status !== 201) {
            const errorText = await startRes.text();
            console.error(`Replicate API Error (${startRes.status}):`, errorText);
            return NextResponse.json({
                error: `AI 모델 호출 실패 (${startRes.status}): ${errorText}`
            }, { status: 500 });
        }

        const prediction = await startRes.json();
        let predictionId = prediction.id;
        console.log("Prediction started:", predictionId);

        // 3. Poll for Completion
        let outputUrl = null;
        let attempts = 0;
        const maxAttempts = 90; // Increased to 90 seconds

        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 1000));
            attempts++;

            const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: {
                    "Authorization": `Token ${apiToken}`,
                }
            });
            const checkJson = await checkRes.json();
            const status = checkJson.status;

            console.log(`Polling ${predictionId}: ${status}`);

            if (status === "succeeded") {
                outputUrl = checkJson.output[0];
                break;
            } else if (status === "failed" || status === "canceled") {
                console.error("Prediction failed:", checkJson.error);
                return NextResponse.json({ error: `AI 변환 오류: ${checkJson.error}` }, { status: 500 });
            }
        }

        if (!outputUrl) {
            console.error("Timeout");
            return NextResponse.json({ error: "AI 변환 시간 초과 (30초)" }, { status: 504 });
        }

        console.log("Downloading result from:", outputUrl);

        // 4. Download Result Image
        const imgRes = await fetch(outputUrl);
        if (!imgRes.ok) {
            throw new Error(`이미지 다운로드 실패: ${imgRes.status}`);
        }
        const imgBlob = await imgRes.blob();
        const imgBuffer = await imgBlob.arrayBuffer();

        // 5. Upload to R2 (Persistence)
        const imageId = crypto.randomUUID();
        const r2Key = `generated/${imageId}.png`;

        if (env.R2) {
            console.log("Saving to R2:", r2Key);
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
                    // Non-critical error
                }
            }
        } else {
            console.warn("R2 Binding missing, skipping save");
        }

        // 7. Return Signed URL
        if (env.R2 && env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME) {
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

        return NextResponse.json({ success: true, image: outputUrl });

    } catch (error) {
        console.error('SERVER ERROR:', error);
        return NextResponse.json({
            error: `서버 내부 오류: ${(error as Error).message}`
        }, { status: 500 });
    }
}
