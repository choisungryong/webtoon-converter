import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // ~7.5MB decoded

const PROMPTS: Record<string, { prompt: string; fallback: string[] }> = {
  ko: {
    prompt: `이 이미지를 보고, 웹툰 말풍선에 들어갈 적절한 한국어 대사를 3개 추천해주세요.

규칙:
- 이미지의 분위기와 상황에 맞는 자연스러운 대사
- 짧고 임팩트 있는 문장 (10글자 내외)
- 캐주얼하고 생동감 있는 표현
- 각 대사는 새 줄로 구분

예시 형식:
와, 대박!
오늘 기분 최고야
여기 너무 좋다~`,
    fallback: ['안녕하세요!', '대박!', '좋아요!'],
  },
  en: {
    prompt: `Look at this image and suggest 3 short dialogue lines for a webtoon speech bubble.

Rules:
- Natural dialogue matching the mood and context of the image
- Short, impactful sentences (around 5-8 words)
- Casual and lively expressions
- Separate each line with a newline

Example format:
Wow, amazing!
Best day ever!
This place is awesome~`,
    fallback: ['Wow!', 'Amazing!', 'Love it!'],
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { image: string; locale?: string };
    const { image, locale: rawLocale } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate image size
    if (image.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    const locale = rawLocale === 'en' ? 'en' : 'ko';
    const { prompt, fallback } = PROMPTS[locale];

    const { env } = getRequestContext();
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ suggestions: fallback });
    }

    // Extract Base64 data from Data URI
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json(
        { error: 'Invalid image format' },
        { status: 400 }
      );
    }
    const mimeType = `image/${base64Match[1]}`;
    const base64Data = base64Match[2];

    // Call Gemini API for text suggestions
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          maxOutputTokens: 200,
        },
      }),
    });

    if (!geminiRes.ok) {
      console.error('[API/Suggest] Gemini API Error:', geminiRes.status);
      return NextResponse.json({ suggestions: fallback });
    }

    const geminiData = await geminiRes.json();
    const textPart = geminiData.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.text
    );

    if (!textPart?.text) {
      return NextResponse.json({ suggestions: fallback });
    }

    // Parse suggestions from response
    const suggestions = textPart.text
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && line.length < 30)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      suggestions: suggestions.length > 0 ? suggestions : fallback,
    });
  } catch (error) {
    console.error('[API/Suggest] Error:', error);
    return NextResponse.json({
      suggestions: ['...', '...', '...'],
    });
  }
}
