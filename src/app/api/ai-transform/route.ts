import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// NOTE: Please set REPLICATE_API_TOKEN in Cloudflare Dashboard.

export async function POST(request: NextRequest) {
    try {
        console.log("Starting AI Transform Request");

        const { getRequestContext } = await import('@cloudflare/next-on-pages');
        const { env } = getRequestContext() as { env: CloudflareEnv };

        const formData = await request.formData();
        const image = formData.get('image');
        const prompt = formData.get('prompt') || "masterpiece, best quality, ultra-detailed, anime style, webtoon style, vibrant colors, clean lines, high quality, 2d anime";
        const negativePrompt = "nsfw, nude, naked, porn, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry";

        if (!image) {
            return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
        }

        const apiToken = env.REPLICATE_API_TOKEN;

        if (!apiToken) {
            return NextResponse.json({ error: 'Replicate API 토큰이 설정되지 않았습니다.' }, { status: 500 });
        }

        // 1. Prepare Input Image
        const arrayBuffer = await (image as Blob).arrayBuffer();
        const base64 = btoa(
            new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        const mimeType = (image as File).type || 'image/png';
        const dataUri = `data:${mimeType};base64,${base64}`;

        // 2. Call Replicate API
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
                    strength: 0.45,
                    scheduler: "DPMSolverMultistep"
                }
            })
        });

        if (startRes.status !== 201) {
            const errorText = await startRes.text();
            return NextResponse.json({ error: `AI 모델 호출 실패: ${errorText}` }, { status: 500 });
        }

        const prediction = await startRes.json();
        let predictionId = prediction.id;

        // 3. Poll for Completion
        let outputUrl = null;
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 3000));
            attempts++;

            const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: { "Authorization": `Token ${apiToken}` }
            });
            const checkJson = await checkRes.json();
            const status = checkJson.status;

            if (status === "succeeded") {
                outputUrl = checkJson.output[0];
                break;
            } else if (status === "failed" || status === "canceled") {
                return NextResponse.json({ error: `AI 변환 오류: ${checkJson.error}` }, { status: 500 });
            }
        }

        if (!outputUrl) {
            return NextResponse.json({ error: "AI 변환 시간 초과" }, { status: 504 });
        }

        // 4. Download Result Image
        const imgRes = await fetch(outputUrl);
        if (!imgRes.ok) {
            throw new Error(`이미지 다운로드 실패: ${imgRes.status}`);
        }
        const imgBlob = await imgRes.blob();
        const imgBuffer = await imgBlob.arrayBuffer();

        // 5. Upload to R2 (using native binding)
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
                    ).bind(imageId, r2Key, prompt.toString()).run();
                } catch (dbError) {
                    console.error('DB Insert Error:', dbError);
                }
            }
        }

        // 6. Return image URL (using our serving endpoint)
        return NextResponse.json({
            success: true,
            image: `/api/gallery/${imageId}/image`,
            imageId: imageId
        });

    } catch (error) {
        console.error('SERVER ERROR:', error);
        return NextResponse.json({
            error: `서버 내부 오류: ${(error as Error).message}`
        }, { status: 500 });
    }
}
