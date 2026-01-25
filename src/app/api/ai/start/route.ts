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
      watercolor: `TRANSFORM THIS IMAGE INTO A PURE 2D GHIBLI-STYLE ILLUSTRATION.
${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1.  **REMOVE ALL PHOTOREALISM**: The output must look like a HAND-DRAWN PAINTING, not a filtered photo.
2.  **FLATTEN SHADING**: Use cel-shading and watercolor washes. NO realistic gradients or skin textures.
3.  **SIMPLIFY DETAILS**: Reduce complex photo details into clean, stylized shapes.
4.  **RE-IMAGINE THE BACKGROUND**: Redraw the background freely in a lush, Miyazaki-esque style. Do not just trace the photo.

STYLE GUIDE:
-   **Line Art**: Soft pencil-like outlines.
-   **Colors**: Pastel, vibrant, "Studio Ghibli" palette.
-   **Eyes**: Large, expressive anime eyes.
-   **Hair**: Clumped, stylized hair strands, not individual realistic hairs.

Output is a DRAWING, not a photo.`,

      'cinematic-noir': `TRANSFORM THIS IMAGE INTO A GRITTY KOREAN THRILLER WEBTOON PANEL.
${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1.  **REMOVE REALISTIC TEXTURES**: Skin should be smooth flat color, clothes should be solid blocks of shadow/light.
2.  **INKING**: Apply heavy, bold black ink lines (Manhwa style). No soft photo edges.
3.  **DRAMATIC RE-LIGHTING**: Change the lighting to be harsh and cinematic (Chiaroscuro). Ignore the original photo's flat lighting if necessary.
4.  **ATMOSPHERE**: Add film grain, rain, or fog effects that are DRAWN, not realistic.

STYLE GUIDE:
-   **Vibe**: Dark, tense, "files of the deceased" or "Signal" webtoon style.
-   **Shadows**: Pitch black shadows.

Output is a WEBTOON PANEL, not a processed photo.`,

      'dark-fantasy': `TRANSFORM THIS IMAGE INTO A SOLO LEVELING STYLE MANHWA PANEL.
${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1.  **COMPLETE RE-DRAW**: The character must look like a hunter/awakener from a manhwa.
2.  **EFFECTS OVER REALISM**: Add magical auras (blue/purple glow) and speed lines.
3.  **SHARP ANGLES**: Jawlines, armor, and clothes should be sharp and angular, not soft/realistic.
4.  **EYES**: Glowing eyes or intense sharp anime eyes.

STYLE GUIDE:
-   **Line Work**: Razor-sharp digital inking.
-   **Color**: High contrast, cool tones, neon accents.

Output is an ACTION MANHWA SCENE, not a photo.`,

      'elegant-fantasy': `TRANSFORM THIS IMAGE INTO A ROMANCE FANTASY (ROFAN) WEBTOON PANEL.
${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1.  **IDEALIZE EVERYTHING**: Make characters incredibly beautiful (shoujo manga style). Remove all realistic skin imperfections.
2.  **SHINY AESTHETIC**: Hair and eyes should sparkle (jewel eyes). Add "shalala" effects.
3.  **COSTUME UPGRADE**: Simplify messy clothes into elegant, flowing fabrics.
4.  **BACKGROUND**: Turn the background into a soft, floral or palace-like illustration.

STYLE GUIDE:
-   **Colors**: Pink, gold, pastel purple, soft whites.
-   **Lines**: Delicate, thin, brownish lines.

Output is a ROMANCE COMIC, not a photo.`,

      'classic-webtoon': `TRANSFORM THIS IMAGE INTO A STANDARD KOREAN WEBTOON EPISODE PANEL.
${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1.  **FLAT COLORS**: Use simple, flat distinct colors (Cell Shading). No complex gradients.
2.  **BOLD OUTLINES**: Every object and person must have a clear BLACK outline.
3.  **CARTOON PROPORTIONS**: Slightly exaggerate expressions for readability.
4.  **CLEAN LOOK**: Remove all visual noise from the photo.

STYLE GUIDE:
-   **Simplicity**: Optimize for mobile readability.
-   **Faces**: Standard webtoon anime faces.

Output is a COMIC STRIP PANEL, not a photo.`,
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
