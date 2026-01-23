import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../../utils/commonUtils';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'alive',
    message: 'Gemini API Worker is Running (Official Adapter)!',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API/Start] POST Request received');

    // Style prompts mapping (내부 프롬프트 - 사용자에게 노출 안됨)
    // IMPROVED: Explicit instructions for ALL people, COMPLETE background transformation, and ANATOMICAL ACCURACY

    // Shared anatomical accuracy rules for all prompts
    const ANATOMICAL_RULES = `
🚫 ABSOLUTE ANATOMICAL RULES (NEVER VIOLATE):
- EXACTLY 2 arms per person, EXACTLY 2 legs per person
- EXACTLY 2 hands with 5 fingers each, EXACTLY 2 feet per person
- NORMAL human body proportions (no elongated torso, limbs, or distorted parts)
- NO extra limbs, NO missing limbs, NO merged body parts
- If body part is hidden in original, keep it hidden - do NOT invent wrong anatomy

🚫 ANTI-CROPPING RULES:
- EVERY character must fit FULLY within the frame (head to toe visible)
- NO cutting off heads at top or feet at bottom
- Maintain the SAME framing as original - do NOT add incorrect body parts`;

    const STYLE_PROMPTS: Record<string, string> = {
      watercolor: `Transform this ENTIRE photo into a Studio Ghibli anime illustration.
${ANATOMICAL_RULES}

CRITICAL REQUIREMENTS:
1. TRANSFORM EVERY SINGLE PERSON in the image into anime characters. If there are 2 people, draw 2 anime characters. If there are 5 people, draw 5 anime characters. Do NOT skip anyone.
2. TRANSFORM THE ENTIRE BACKGROUND - every wall, floor, sky, tree, furniture, and object must be redrawn in Ghibli watercolor style.
3. Maintain the EXACT positions and poses of all people and objects.
4. VERIFY anatomical correctness: 2 arms, 2 legs, proper proportions per character.

STYLE: Hand-painted watercolor, soft pastel colors, visible brushstrokes, dreamy Miyazaki aesthetic, warm lighting, lush organic textures. Large expressive anime eyes on all characters.

OUTPUT: A complete Ghibli-style illustration where NOTHING looks photorealistic. Every pixel must be transformed.

DO NOT: Add text, speech bubbles, leave photorealistic elements, or create anatomical errors.`,

      'cinematic-noir': `Transform this ENTIRE photo into a Korean thriller webtoon illustration with cinematic noir atmosphere.
${ANATOMICAL_RULES}

CRITICAL REQUIREMENTS:
1. DRAW EVERY SINGLE PERSON as stylized manhwa characters with sharp, intense features. If multiple people exist, ALL must be drawn.
2. TRANSFORM THE ENTIRE BACKGROUND into a moody, atmospheric urban scene with dramatic lighting.
3. Maintain exact positions and add tension/mystery to the scene.
4. VERIFY anatomical correctness: 2 arms, 2 legs, proper proportions per character.

STYLE GUIDE:
- Lighting: Dramatic chiaroscuro with deep shadows and stark highlights, like a film noir scene
- Colors: Muted palette with desaturated blues, grays, and occasional warm accent (orange/red)
- Atmosphere: Rain, fog, or haze effects to add mystery
- Lines: Bold black outlines with crosshatching for shadows
- Mood: Tense, mysterious, like a scene from 괴담출근 or 픽미업

OUTPUT: A complete manhwa panel that looks like a thriller webtoon. The scene should feel cinematic and ominous.

DO NOT: Add text, speech bubbles, leave photorealistic elements, or create anatomical errors.`,

      'dark-fantasy': `Transform this ENTIRE photo into a dark fantasy Korean manhwa illustration.
${ANATOMICAL_RULES}

CRITICAL REQUIREMENTS:
1. DRAW EVERY SINGLE PERSON as manhwa characters with sharp features. If multiple people exist, ALL of them must be drawn.
2. REDRAW THE ENTIRE BACKGROUND with dramatic shadowing and manhwa-style environments.
3. Maintain exact positions but add dramatic flair to poses.
4. VERIFY anatomical correctness: 2 arms, 2 legs, proper proportions per character.

STYLE: Solo Leveling aesthetic, bold black ink outlines on EVERYTHING, high contrast lighting, deep shadows, blue/purple energy effects, sharp angular linework, intense expressions.

OUTPUT: A complete manhwa panel. EVERY element (people, clothes, background, objects) must have visible drawn outlines.

DO NOT: Add text, speech bubbles, leave photorealistic elements, or create anatomical errors.`,

      'elegant-fantasy': `Transform this ENTIRE photo into an elegant Korean romance fantasy webtoon illustration.
${ANATOMICAL_RULES}

CRITICAL REQUIREMENTS:
1. DRAW EVERY SINGLE PERSON as beautiful manhwa characters. If there are couples or groups, draw ALL of them.
2. TRANSFORM THE ENTIRE BACKGROUND into a dreamy illustrated scene.
3. Maintain exact positions and add romantic atmosphere.
4. VERIFY anatomical correctness: 2 arms, 2 legs, proper proportions per character.

STYLE: Premium romance webtoon aesthetic, delicate linework, detailed sparkling eyes, flowing hair with highlights, soft gradient shading, subtle sparkle effects, pastel and jewel-tone colors.

OUTPUT: A complete webtoon panel suitable for a romance series. EVERYTHING must be illustrated.

DO NOT: Add text, speech bubbles, leave photorealistic elements, or create anatomical errors.`,

      'classic-webtoon': `Transform this ENTIRE photo into a Korean webtoon comic panel.
${ANATOMICAL_RULES}

CRITICAL REQUIREMENTS:
1. DRAW EVERY SINGLE PERSON as webtoon characters with expressive faces. Count them - ALL must be converted.
2. DRAW THE ENTIRE BACKGROUND with bold outlines and flat colors - every object, wall, and surface.
3. Maintain exact positions and expressions.
4. VERIFY anatomical correctness: 2 arms, 2 legs, proper proportions per character.

STYLE: Classic Korean webtoon, bold black outlines on EVERYTHING, flat cell-shaded colors, simplified details, clean comic art, expressive cartoon faces, minimal gradients.

OUTPUT: A complete webtoon panel. EVERY element must have clear black outlines and flat coloring.

DO NOT: Add text, speech bubbles, leave photorealistic elements, or create anatomical errors.`,
    };

    const DEFAULT_PROMPT = `Transform this ENTIRE photo into a Korean webtoon comic illustration. 
${ANATOMICAL_RULES}
DRAW EVERY PERSON as cartoon characters (if there are 2 people, draw 2 characters). REDRAW THE ENTIRE BACKGROUND with bold outlines. EVERY element must be illustrated. DO NOT add text or speech bubbles. DO NOT create anatomical errors.`;

    // Read JSON Body
    const body = (await request.json()) as {
      image: string;
      styleId?: string;
      prompt?: string;
      userId?: string;
    };
    const image = body.image;
    const styleId = body.styleId || 'classic-webtoon';
    const userId = body.userId || 'anonymous';
    const prompt = STYLE_PROMPTS[styleId] || body.prompt || DEFAULT_PROMPT;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const { env } = getRequestContext();

    // Debug Logging
    console.log('[API/Start] Environment Check:', {
      hasEnv: !!env,
      hasGeminiKey: !!env?.GEMINI_API_KEY,
      keyPrefix: env?.GEMINI_API_KEY
        ? env.GEMINI_API_KEY.substring(0, 4) + '...'
        : 'NONE',
      styleId,
      userId,
    });

    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        '[API/Start] Critical Error: GEMINI_API_KEY is missing in env!'
      );
      return NextResponse.json(
        {
          error: 'Server Configuration Error: API Key missing',
          debug: { hasEnv: !!env, keys: Object.keys(env || {}) },
        },
        { status: 500 }
      );
    }

    // Daily Usage Limit Check (30 images/day per user)
    const DAILY_LIMIT = 30;
    if (env.DB && userId !== 'anonymous') {
      try {
        // Get start of today (UTC)
        const now = Math.floor(Date.now() / 1000);
        const todayStart = now - (now % 86400);

        const usageResult = (await env.DB.prepare(
          `SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND created_at >= ?`
        )
          .bind(userId, todayStart)
          .first()) as { count: number } | null;

        const usedCount = usageResult?.count || 0;
        console.log('[API/Start] Daily Usage Check:', {
          userId,
          usedCount,
          limit: DAILY_LIMIT,
        });

        if (usedCount >= DAILY_LIMIT) {
          return NextResponse.json(
            {
              error: 'DAILY_LIMIT_EXCEEDED',
              message: `오늘의 무료 변환 한도(${DAILY_LIMIT}장)를 초과했습니다. 내일 다시 이용해주세요!`,
              limit: DAILY_LIMIT,
              used: usedCount,
            },
            { status: 429 }
          );
        }
      } catch (dbError) {
        console.error('[API/Start] Usage check failed:', dbError);
        // Continue even if usage check fails
      }
    }

    // Extract Base64 data from Data URI
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json(
        { error: 'Invalid image format. Expected Base64 Data URI.' },
        { status: 400 }
      );
    }
    const mimeType = `image/${base64Match[1]}`;
    const base64Data = base64Match[2];

    // Call Gemini API
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType: mimeType, data: base64Data } },
              { text: `[GENERATE NEW IMAGE] ${prompt}` },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: 1.2,
          topP: 0.99,
          topK: 40,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
      }),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error('Gemini API Error:', geminiRes.status, errorText);

      // Check for quota/rate limit errors
      if (
        geminiRes.status === 429 ||
        errorText.toLowerCase().includes('quota') ||
        errorText.toLowerCase().includes('limit') ||
        errorText.toLowerCase().includes('rate')
      ) {
        return NextResponse.json(
          {
            error: 'QUOTA_EXCEEDED',
            message: '서비스 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
            details: errorText,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `Gemini Error: ${errorText}` },
        { status: 500 }
      );
    }

    const geminiData = await geminiRes.json();
    const candidates = geminiData.candidates;

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'No image generated by Gemini' },
        { status: 500 }
      );
    }

    const parts = candidates[0]?.content?.parts || [];
    let generatedImageBase64 = null;
    let generatedMimeType = 'image/png';

    for (const part of parts) {
      if (part.inlineData) {
        generatedImageBase64 = part.inlineData.data;
        generatedMimeType = part.inlineData.mimeType || 'image/png';
        break;
      }
    }

    if (!generatedImageBase64) {
      const textPart = parts.find((p: { text?: string }) => p.text);
      const errorMessage = textPart?.text || 'Gemini did not return an image';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // Save to R2 for persistence (Gallery Feature) - REMOVED TO PREVENT DUPLICATE SAVES
    // The frontend now handles saving explicitly via /api/gallery
    const imageId = generateUUID();
    // const r2Key = `generated/${imageId}.png`; // Disabled
    let savedToGallery = false;

    /* Auto-save disabled to prevent duplicates (Original vs Edited)
        if (env.R2) {
            try {
                // ... (R2 and DB logic removed)
            } catch (saveError) {
                console.error('Failed to save to gallery:', saveError);
            }
        }
        */

    // Log successful conversion for usage tracking
    if (env.DB && userId !== 'anonymous') {
      try {
        await env.DB.prepare(
          `INSERT INTO usage_logs (id, user_id, action) VALUES (?, ?, 'convert')`
        )
          .bind(generateUUID(), userId)
          .run();
        console.log('[API/Start] Usage logged for user:', userId);
      } catch (logError) {
        console.error('[API/Start] Failed to log usage:', logError);
        // Continue even if logging fails
      }
    }

    // Return generated image as Data URI
    const outputDataUri = `data:${generatedMimeType};base64,${generatedImageBase64}`;

    return NextResponse.json({
      success: true,
      image: outputDataUri,
      imageId: imageId,
      savedToGallery: savedToGallery,
      status: 'completed',
    });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
