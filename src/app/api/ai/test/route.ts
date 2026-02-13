import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

/**
 * Diagnostic endpoint to test Gemini API connectivity.
 * GET /api/ai/test — tests API key + model availability
 */
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set', ok: false });
    }

    // Test 1: simple text generation (fastest check)
    const textEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), 10_000);

    const textRes = await fetch(textEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller1.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say "hello" in one word' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 10 },
      }),
    });
    clearTimeout(timeout1);

    const textStatus = textRes.status;
    const textBody = await textRes.text();

    // Test 2: check image model exists
    const imageEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 10_000);

    const imageRes = await fetch(imageEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller2.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Draw a simple yellow circle on white background' }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          temperature: 0.5,
        },
      }),
    });
    clearTimeout(timeout2);

    const imageStatus = imageRes.status;
    const imageBody = await imageRes.text();

    // Parse image response to check for image
    let hasImage = false;
    let imageError = '';
    try {
      const imageData = JSON.parse(imageBody);
      const parts = imageData.candidates?.[0]?.content?.parts || [];
      hasImage = parts.some((p: any) => p.inlineData);
      if (!hasImage) {
        const blockReason = imageData.promptFeedback?.blockReason;
        const finishReason = imageData.candidates?.[0]?.finishReason;
        imageError = blockReason || finishReason || 'no image in response';
      }
    } catch {
      imageError = imageBody.substring(0, 200);
    }

    return NextResponse.json({
      ok: textStatus === 200 && imageStatus === 200 && hasImage,
      textModel: {
        status: textStatus,
        ok: textStatus === 200,
        response: textBody.substring(0, 200),
      },
      imageModel: {
        status: imageStatus,
        ok: imageStatus === 200,
        hasImage,
        error: imageError || undefined,
        response: imageBody.substring(0, 300),
      },
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    });
  }
}
