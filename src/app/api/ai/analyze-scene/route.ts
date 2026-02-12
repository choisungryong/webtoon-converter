import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import type { SceneAnalysis } from '../../../../types';

export const runtime = 'edge';

const ANALYZE_TIMEOUT_MS = 15_000;

const ANALYSIS_PROMPT = `Analyze this photograph for a webtoon conversion system. Identify ALL visual elements that need to be redrawn as illustration.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "people": [
    {"role": "main", "description": "young woman with long black hair wearing a blue jacket", "position": "center"},
    {"role": "bystander", "description": "elderly man in a gray coat", "position": "left background"}
  ],
  "environment": {
    "description": "busy urban street at sunset",
    "surfaces": ["asphalt road", "concrete sidewalk", "brick building facades", "glass storefronts", "overcast sky"],
    "lighting": "warm golden hour sunlight from the left"
  },
  "colorPalette": ["warm orange", "gray blue", "dark brown"],
  "objectCount": 12
}

Rules:
- "role" is "main" for focal subjects, "bystander" for everyone else
- List EVERY person visible, even partially occluded ones in the far background
- List EVERY distinct surface type in "surfaces"
- "objectCount" is the total count of distinct objects (cars, signs, bags, etc.)
- Keep descriptions concise (under 15 words each)`;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { image: string };
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const { env } = getRequestContext();
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Parse base64
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const mimeType = `image/${base64Match[1].toLowerCase()}`;
    const base64Data = base64Match[2];

    // Call Gemini Flash (text-only output, fast)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: ANALYSIS_PROMPT },
            { inlineData: { mimeType, data: base64Data } },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error('[analyze-scene] Gemini error:', res.status);
      return NextResponse.json({ error: 'Analysis failed' }, { status: 502 });
    }

    const data = await res.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON response
    let analysis: SceneAnalysis;
    try {
      const parsed = JSON.parse(text);
      // Validate required fields
      analysis = {
        people: Array.isArray(parsed.people) ? parsed.people : [],
        environment: {
          description: parsed.environment?.description || 'unknown environment',
          surfaces: Array.isArray(parsed.environment?.surfaces) ? parsed.environment.surfaces : [],
          lighting: parsed.environment?.lighting || 'natural lighting',
        },
        colorPalette: Array.isArray(parsed.colorPalette) ? parsed.colorPalette : [],
        objectCount: typeof parsed.objectCount === 'number' ? parsed.objectCount : 0,
      };
    } catch {
      console.warn('[analyze-scene] Failed to parse JSON:', text.substring(0, 200));
      return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 502 });
    }

    console.log(`[analyze-scene] Found ${analysis.people.length} people, ${analysis.environment.surfaces.length} surfaces`);

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn('[analyze-scene] Timeout');
      return NextResponse.json({ error: 'Analysis timeout' }, { status: 504 });
    }
    console.error('[analyze-scene] Error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
