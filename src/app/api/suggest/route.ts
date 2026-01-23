import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    console.log('[API/Suggest] POST Request received');

    const body = (await request.json()) as { image: string };
    const image = body.image;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const { env } = getRequestContext();
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('[API/Suggest] GEMINI_API_KEY is missing');
      return NextResponse.json({
        suggestions: ['안녕하세요!', '오늘 날씨가 좋네요', '정말 멋져요!'],
      });
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

    const prompt = `이 이미지를 보고, 웹툰 말풍선에 들어갈 적절한 한국어 대사를 3개 추천해주세요.
        
규칙:
- 이미지의 분위기와 상황에 맞는 자연스러운 대사
- 짧고 임팩트 있는 문장 (10글자 내외)
- 캐주얼하고 생동감 있는 표현
- 각 대사는 새 줄로 구분

예시 형식:
와, 대박!
오늘 기분 최고야
여기 너무 좋다~`;

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
      console.error('[API/Suggest] Gemini API Error');
      return NextResponse.json({
        suggestions: ['여기 좋다!', '최고야!', '대박!'],
      });
    }

    const geminiData = await geminiRes.json();
    const textPart = geminiData.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.text
    );

    if (!textPart?.text) {
      return NextResponse.json({
        suggestions: ['멋져요!', '좋아요!', '완벽해!'],
      });
    }

    // Parse suggestions from response
    const suggestions = textPart.text
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && line.length < 30)
      .slice(0, 5);

    console.log('[API/Suggest] Generated suggestions:', suggestions);

    return NextResponse.json({
      success: true,
      suggestions:
        suggestions.length > 0
          ? suggestions
          : ['여기 좋다!', '최고야!', '대박!'],
    });
  } catch (error) {
    console.error('[API/Suggest] Error:', error);
    return NextResponse.json({
      suggestions: ['안녕!', '좋아요!', '대박!'],
    });
  }
}
