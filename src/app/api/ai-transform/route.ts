import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../utils/commonUtils';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();

    const formData = await request.formData();
    const image = formData.get('image');
    const prompt =
      formData.get('prompt') ||
      'masterpiece, best quality, ultra-detailed, anime style, webtoon style';
    const negativePrompt = 'nsfw, nude, naked, porn, lowres, bad anatomy';

    if (!image) {
      return NextResponse.json(
        { error: '이미지가 없습니다.' },
        { status: 400 }
      );
    }

    const apiToken = env.REPLICATE_API_TOKEN;

    if (!apiToken) {
      return NextResponse.json(
        { error: 'Replicate API 토큰이 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const arrayBuffer = await (image as Blob).arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );
    const mimeType = (image as File).type || 'image/png';
    const dataUri = `data:${mimeType};base64,${base64}`;

    const modelVersion =
      '42a996d39a96aedc57b2e0aa8105dea39c9c89d9d266caf6bb4327a1c191b061';

    const startRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiToken}`,
        'Content-Type': 'application/json',
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
          scheduler: 'DPMSolverMultistep',
        },
      }),
    });

    if (startRes.status !== 201) {
      const errorText = await startRes.text();
      return NextResponse.json(
        { error: `AI 모델 호출 실패: ${errorText}` },
        { status: 500 }
      );
    }

    const prediction = await startRes.json();
    let predictionId = prediction.id;

    let outputUrl = null;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 3000));
      attempts++;

      const checkRes = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: { Authorization: `Token ${apiToken}` },
        }
      );
      const checkJson = await checkRes.json();
      const status = checkJson.status;

      if (status === 'succeeded') {
        outputUrl = checkJson.output[0];
        break;
      } else if (status === 'failed' || status === 'canceled') {
        return NextResponse.json(
          { error: `AI 변환 오류: ${checkJson.error}` },
          { status: 500 }
        );
      }
    }

    if (!outputUrl) {
      return NextResponse.json({ error: 'AI 변환 시간 초과' }, { status: 504 });
    }

    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) {
      throw new Error(`이미지 다운로드 실패: ${imgRes.status}`);
    }
    const imgBlob = await imgRes.blob();
    const imgBuffer = await imgBlob.arrayBuffer();

    const imageId = generateUUID();
    const r2Key = `generated/${imageId}.png`;

    if (env.R2) {
      await env.R2.put(r2Key, imgBuffer, {
        httpMetadata: { contentType: 'image/png' },
      });

      if (env.DB) {
        try {
          await env.DB.prepare(
            `INSERT INTO generated_images (id, r2_key, prompt) VALUES (?, ?, ?)`
          )
            .bind(imageId, r2Key, prompt.toString())
            .run();
        } catch (dbError) {
          console.error('DB Insert Error:', dbError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      image: `/api/gallery/${imageId}/image`,
      imageId: imageId,
    });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    return NextResponse.json(
      {
        error: `서버 내부 오류: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
