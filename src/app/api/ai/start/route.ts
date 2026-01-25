
import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// Inline UUID generator to prevent import path issues
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
    // Anatomical Rules & Prompts
    const ANATOMICAL_RULES = `
[STRICT] ABSOLUTE ANATOMICAL RULES(NEVER VIOLATE):
- EXACTLY 2 arms per person, EXACTLY 2 legs per person
  - EXACTLY 2 hands with 5 fingers each, EXACTLY 2 feet per person
    - NORMAL human body proportions(no elongated torso, limbs, or distorted parts)
      - NO extra limbs, NO missing limbs, NO merged body parts
        - If body part is hidden in original, keep it hidden - do NOT invent wrong anatomy

        [STRICT] ANTI - CROPPING RULES:
- EVERY character must fit FULLY within the frame(head to toe visible)
  - NO cutting off heads at top or feet at bottom
    - Maintain the SAME framing as original - do NOT add incorrect body parts`;
    const STYLE_PROMPTS: Record<string, string> = {
      watercolor: `TRANSFORM THIS IMAGE INTO A PURE 2D GHIBLI - STYLE ILLUSTRATION.
  ${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1. ** REMOVE ALL PHOTOREALISM **: The output must look like a HAND - DRAWN PAINTING, not a filtered photo.
2. ** FLATTEN SHADING **: Use cel - shading and watercolor washes.NO realistic gradients or skin textures.
3. ** SIMPLIFY DETAILS **: Reduce complex photo details into clean, stylized shapes.
4. ** RE - IMAGINE THE BACKGROUND **: Redraw the background freely in a lush, Miyazaki - esque style.Do not just trace the photo.

STYLE GUIDE:
-   ** Line Art **: Soft pencil - like outlines.
-   ** Colors **: Pastel, vibrant, "Studio Ghibli" palette.
-   ** Eyes **: Large, expressive anime eyes.
-   ** Hair **: Clumped, stylized hair strands, not individual realistic hairs.

Output is a DRAWING, not a photo.`,

      'cinematic-noir': `TRANSFORM THIS IMAGE INTO A GRITTY KOREAN THRILLER WEBTOON PANEL.
  ${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1. ** REMOVE REALISTIC TEXTURES **: Skin should be smooth flat color, clothes should be solid blocks of shadow / light.
2. ** INKING **: Apply heavy, bold black ink lines(Manhwa style).No soft photo edges.
3. ** DRAMATIC RE - LIGHTING **: Change the lighting to be harsh and cinematic(Chiaroscuro).Ignore the original photo's flat lighting if necessary.
4. ** ATMOSPHERE **: Add film grain, rain, or fog effects that are DRAWN, not realistic.

STYLE GUIDE:
-   ** Vibe **: Dark, tense, "files of the deceased" or "Signal" webtoon style.
-   ** Shadows **: Pitch black shadows.

Output is a WEBTOON PANEL, not a processed photo.`,

      'dark-fantasy': `TRANSFORM THIS IMAGE INTO A SOLO LEVELING STYLE MANHWA PANEL.
  ${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1. ** COMPLETE RE - DRAW **: The character must look like a hunter / awakener from a manhwa.
2. ** EFFECTS OVER REALISM **: Add magical auras(blue / purple glow) and speed lines.
3. ** SHARP ANGLES **: Jawlines, armor, and clothes should be sharp and angular, not soft / realistic.
4. ** EYES **: Glowing eyes or intense sharp anime eyes.

STYLE GUIDE:
-   ** Line Work **: Razor - sharp digital inking.
-   ** Color **: High contrast, cool tones, neon accents.

Output is an ACTION MANHWA SCENE, not a photo.`,

      'elegant-fantasy': `TRANSFORM THIS IMAGE INTO A ROMANCE FANTASY(ROFAN) WEBTOON PANEL.
  ${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1. ** IDEALIZE EVERYTHING **: Make characters incredibly beautiful(shoujo manga style).Remove all realistic skin imperfections.
2. ** SHINY AESTHETIC **: Hair and eyes should sparkle(jewel eyes).Add "shalala" effects.
3. ** COSTUME UPGRADE **: Simplify messy clothes into elegant, flowing fabrics.
4. ** BACKGROUND **: Turn the background into a soft, floral or palace - like illustration.

STYLE GUIDE:
-   ** Colors **: Pink, gold, pastel purple, soft whites.
-   ** Lines **: Delicate, thin, brownish lines.

Output is a ROMANCE COMIC, not a photo.`,

      'classic-webtoon': `TRANSFORM THIS IMAGE INTO A STANDARD KOREAN WEBTOON EPISODE PANEL.
  ${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1. ** FLAT COLORS **: Use simple, flat distinct colors(Cell Shading).No complex gradients.
2. ** BOLD OUTLINES **: Every object and person must have a clear BLACK outline.
3. ** CARTOON PROPORTIONS **: Slightly exaggerate expressions for readability.
4. ** CLEAN LOOK **: Remove all visual noise from the photo.

STYLE GUIDE:
-   ** Simplicity **: Optimize for mobile readability.
-   ** Faces **: Standard webtoon anime faces.

Output is a COMIC STRIP PANEL, not a photo.`,
    };

    const DEFAULT_PROMPT = `Transform this ENTIRE photo into a Korean webtoon comic illustration.
  ${ANATOMICAL_RULES}
DRAW EVERY PERSON as cartoon characters.REDRAW THE ENTIRE BACKGROUND with bold outlines.EVERY element must be illustrated.DO NOT add text or speech bubbles.DO NOT create anatomical errors.`;

    // 1. Parse Request (Safe Mode)
    let body;
    try {
      body = (await request.json()) as {
        image: string;
        styleId?: string;
        prompt?: string;
        userId?: string;
      };
    } catch (parseErr) {
      console.error('JSON Parse Fail:', parseErr);
      return NextResponse.json({ error: 'Invalid JSON Body' }, { status: 400 });
    }

    const { image, styleId = 'classic-webtoon', userId = 'anonymous' } = body;
    const prompt = STYLE_PROMPTS[styleId] || body.prompt || DEFAULT_PROMPT;

    // Validate Fields
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    const { env, ctx } = getRequestContext();
    if (!env || !env.DB) return NextResponse.json({ error: 'DB Binding Missing' }, { status: 500 });

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API Key Missing' }, { status: 500 });

    // 2. Create Job ID & Initial DB Entry
    const jobId = generateUUID();
    const now = Date.now();

    await env.DB.prepare(
      'INSERT INTO conversion_jobs (id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(jobId, userId, 'pending', now, now)
      .run();

    // 3. Start Background Processing (WaitUntil)
    ctx.waitUntil(
      (async () => {
        try {
          await env.DB.prepare('UPDATE conversion_jobs SET status = ?, updated_at = ? WHERE id = ?')
            .bind('processing', Date.now(), jobId)
            .run();

          // --- Gemini Logic Start ---
          const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!base64Match) throw new Error('Invalid image format');

          const mimeType = `image / ${base64Match[1]} `;
          const base64Data = base64Match[2];

          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

          const geminiRes = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inlineData: { mimeType: mimeType, data: base64Data } },
                  { text: `[GENERATE NEW IMAGE] ${prompt}` },
                ]
              }],
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
                temperature: 1.2,
                topP: 0.99,
                topK: 40,
              },
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
              ]
            })
          });

          if (!geminiRes.ok) {
            const errorText = await geminiRes.text();
            throw new Error(`Gemini API Error: ${geminiRes.status} ${errorText}`);
          }

          const geminiData = await geminiRes.json();
          const candidates = geminiData.candidates;
          if (!candidates || candidates.length === 0) throw new Error('No image generated');

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

          if (!generatedImageBase64) throw new Error('Gemini returned no image data');

          const outputDataUri = `data:${generatedMimeType};base64,${generatedImageBase64}`;
          // --- Gemini Logic End ---

          // 4. Update Job with Success
          await env.DB.prepare(
            'UPDATE conversion_jobs SET status = ?, result_url = ?, updated_at = ? WHERE id = ?'
          )
            .bind('completed', outputDataUri, Date.now(), jobId)
            .run();

          // Log usage
          if (userId !== 'anonymous') {
            await env.DB.prepare(
              `INSERT INTO usage_logs (id, user_id, action) VALUES (?, ?, 'convert')`
            )
              .bind(generateUUID(), userId)
              .run().catch(() => { });
          }

        } catch (error) {
          console.error(`[Background] Job ${jobId} failed:`, error);
          await env.DB.prepare(
            'UPDATE conversion_jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?'
          )
            .bind('failed', (error as Error).message, Date.now(), jobId)
            .run();
        }
      })()
    );

    // 5. Return Job ID immediately
    return NextResponse.json({
      success: true,
      jobId: jobId,
      status: 'pending',
      message: 'Conversion started in background',
    });

  } catch (error) {
    console.error('API Start Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
