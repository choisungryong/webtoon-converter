import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../../utils/commonUtils';
import type { EpisodeStoryData } from '../../../../types';

export const runtime = 'edge';

const MAX_IMAGES_PER_EPISODE = 8;

function buildStoryPrompt(imageCount: number, locale: 'ko' | 'en'): string {
  const lang = locale === 'ko' ? 'Korean' : 'English';
  return `You are a professional webtoon story writer. Analyze these ${imageCount} photographs and create a compelling webtoon episode story.

TASK: Create a story that connects all the photos into one cohesive narrative. Each photo becomes one panel.

RULES:
- Write all dialogue and narration in ${lang}
- Each panel's dialogue must be 15 characters or less (short, punchy)
- Narration can be longer (1-2 sentences)
- Make the story feel like a real webtoon episode with emotional beats
- bubbleStyle: "normal" for regular speech, "thought" for inner thoughts, "shout" for exclamations
- cameraDirection: describe the camera angle (e.g. "close-up", "wide shot", "low angle", "bird's eye")
- emotion: the dominant emotion of the panel (e.g. "happy", "surprised", "melancholic", "determined")
- sceneDescription: brief visual description of what the panel should emphasize

OUTPUT FORMAT (JSON only, no markdown):
{
  "title": "Episode title",
  "synopsis": "1-2 sentence story summary",
  "panels": [
    {
      "panelIndex": 0,
      "dialogue": "short dialogue or null",
      "narration": "narration text or null",
      "bubbleStyle": "normal",
      "cameraDirection": "close-up",
      "emotion": "happy",
      "sceneDescription": "description of scene"
    }
  ]
}

Return ONLY valid JSON. No explanation, no markdown code blocks.`;
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const body = (await request.json()) as {
      webtoonId: string;
      userId: string;
      locale?: 'ko' | 'en';
    };

    const { webtoonId, userId, locale = 'ko' } = body;

    if (!webtoonId || !userId) {
      return NextResponse.json(
        { error: 'Missing webtoonId or userId' },
        { status: 400 }
      );
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key not configured' },
        { status: 500 }
      );
    }

    if (!env.DB || !env.R2) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 1. Get webtoon record and source_image_ids
    const webtoonRow = await env.DB.prepare(
      `SELECT id, user_id, source_image_ids FROM generated_images WHERE id = ? AND type = 'webtoon'`
    ).bind(webtoonId).first() as any;

    if (!webtoonRow) {
      return NextResponse.json(
        { error: 'Webtoon not found' },
        { status: 404 }
      );
    }

    if (webtoonRow.user_id !== userId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    if (!webtoonRow.source_image_ids) {
      return NextResponse.json(
        { error: 'NO_SOURCE_IMAGES' },
        { status: 400 }
      );
    }

    const sourceImageIds: string[] = JSON.parse(webtoonRow.source_image_ids);
    if (sourceImageIds.length === 0) {
      return NextResponse.json(
        { error: 'NO_SOURCE_IMAGES' },
        { status: 400 }
      );
    }

    // Limit to max images
    const limitedIds = sourceImageIds.slice(0, MAX_IMAGES_PER_EPISODE);

    // 2. Fetch original photos from R2
    const imageParts: { inlineData: { mimeType: string; data: string } }[] = [];

    for (const imgId of limitedIds) {
      const imgRow = await env.DB.prepare(
        `SELECT r2_key, original_r2_key FROM generated_images WHERE id = ?`
      ).bind(imgId).first() as any;

      if (!imgRow) continue;

      // Prefer original photo, fall back to converted image
      const r2Key = imgRow.original_r2_key || imgRow.r2_key;
      const r2Object = await env.R2.get(r2Key);
      if (!r2Object) continue;

      const arrayBuffer = await r2Object.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const mimeType = r2Object.httpMetadata?.contentType || 'image/jpeg';

      imageParts.push({
        inlineData: { mimeType, data: base64 },
      });
    }

    if (imageParts.length === 0) {
      return NextResponse.json(
        { error: 'Could not load source images' },
        { status: 400 }
      );
    }

    // 3. Call Gemini text model for story generation
    const storyPrompt = buildStoryPrompt(imageParts.length, locale);
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const parts: any[] = [...imageParts, { text: storyPrompt }];

    const geminiRes = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.9,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error('[Episode/Story] Gemini Error:', geminiRes.status, errorText);
      if (geminiRes.status === 429) {
        return NextResponse.json(
          { error: 'QUOTA_EXCEEDED' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'Story generation failed' },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json() as any;
    const candidates = geminiData.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'Story generation returned no result' },
        { status: 502 }
      );
    }

    // Extract text from response
    const responseParts = candidates[0]?.content?.parts || [];
    let storyText = '';
    for (const part of responseParts) {
      if (part.text) {
        storyText += part.text;
      }
    }

    // Parse JSON from response (strip markdown code blocks if present)
    let cleanText = storyText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    let storyData: EpisodeStoryData;
    try {
      storyData = JSON.parse(cleanText);
    } catch (parseErr) {
      console.error('[Episode/Story] JSON parse error:', parseErr, 'Raw:', cleanText.substring(0, 500));
      return NextResponse.json(
        { error: 'Story generation returned invalid format' },
        { status: 502 }
      );
    }

    // Validate story structure
    if (!storyData.title || !storyData.panels || !Array.isArray(storyData.panels)) {
      return NextResponse.json(
        { error: 'Story generation returned incomplete data' },
        { status: 502 }
      );
    }

    // Ensure panel count matches image count
    if (storyData.panels.length > imageParts.length) {
      storyData.panels = storyData.panels.slice(0, imageParts.length);
    }
    // Ensure panelIndex is correct
    storyData.panels = storyData.panels.map((panel, i) => ({
      ...panel,
      panelIndex: i,
    }));

    // 4. Save episode to DB
    const episodeId = generateUUID();
    await env.DB.prepare(
      `INSERT INTO premium_episodes (id, user_id, title, story_data, source_webtoon_id, status) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      episodeId,
      userId,
      storyData.title,
      JSON.stringify(storyData),
      webtoonId,
      'pending'
    ).run();

    return NextResponse.json({
      success: true,
      episodeId,
      story: storyData,
    });
  } catch (error) {
    console.error('[Episode/Story] Error:', error);
    return NextResponse.json(
      { error: 'Episode story generation failed' },
      { status: 500 }
    );
  }
}
