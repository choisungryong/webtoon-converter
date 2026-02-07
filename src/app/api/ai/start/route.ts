import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

const MAX_RETRIES = 2;
const GEMINI_TIMEOUT_MS = 60_000; // 60 seconds
const RATE_LIMIT_PER_MINUTE = 10;

/** Simple per-user rate limiting using usage_logs table */
async function checkRateLimit(db: any, userId: string): Promise<boolean> {
  if (!db || !userId) return true; // Skip if no DB or user
  try {
    const oneMinuteAgo = Date.now() - 60_000;
    const result = await db.prepare(
      `SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND created_at > ?`
    ).bind(userId, oneMinuteAgo).first() as any;
    return (result?.count || 0) < RATE_LIMIT_PER_MINUTE;
  } catch {
    return true; // Fail open — don't block if DB check fails
  }
}

async function logUsage(db: any, userId: string): Promise<void> {
  if (!db || !userId) return;
  try {
    const { generateUUID } = await import('../../../../utils/commonUtils');
    await db.prepare(
      `INSERT INTO usage_logs (id, user_id, action, created_at) VALUES (?, ?, 'convert', ?)`
    ).bind(generateUUID(), userId, Date.now()).run();
  } catch { /* best effort */ }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'alive',
    message: 'Gemini API Worker is Running (Synchronous Mode)',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Build the style prompt for the given styleId.
 * Prompts are structured following Google's recommendation:
 *   1. Core instruction (what to do) at the top
 *   2. Detailed style description (narrative, descriptive)
 *   3. Anatomy/quality guardrails at the bottom
 */
function buildPrompt(styleId: string, customPrompt?: string): string {
  const ANATOMY_GUARDRAILS = `
ANATOMY & FRAMING RULES:
- Correct human anatomy: 2 arms, 2 legs, 2 hands with 5 fingers each
- Normal proportions, no extra or missing limbs
- Keep hidden body parts hidden — do not invent anatomy
- Maintain the same framing as the original photo`;

  const STYLE_PROMPTS: Record<string, string> = {
    watercolor: `Completely redraw this photograph as a hand-painted Studio Ghibli-style illustration. Do not apply a filter — create an entirely new illustrated image from scratch.

STYLE: Soft watercolor washes with warm pastel colors reminiscent of Hayao Miyazaki films. Gentle pencil-like outlines define each shape. Characters have large expressive anime eyes and clumped stylized hair strands. Shading is flat cel-shading with no realistic skin texture or photographic gradients. The background should be reimagined as a lush, dreamy Ghibli-esque landscape with simplified illustrated shapes.

OUTPUT REQUIREMENTS:
- The result must be a 100% ILLUSTRATED PAINTING, not a photo with effects
- Preserve the original composition, character poses, and expressions
- Do not add any text, speech bubbles, or watermarks
${ANATOMY_GUARDRAILS}`,

    'cinematic-noir': `Completely redraw this photograph as a gritty Korean thriller manhwa panel in the style of webtoons like "Bastard" or "Sweet Home". Do not apply a filter — illustrate everything from scratch.

STYLE: Heavy bold black ink lines with dramatic chiaroscuro lighting. Skin rendered as smooth flat color blocks, clothes as solid shadow/light shapes. Pitch-black shadows dominate the composition. The atmosphere is dark and tense with drawn film grain or rain effects. The overall mood evokes a Korean crime thriller webtoon.

OUTPUT REQUIREMENTS:
- The result must be a hand-inked WEBTOON PANEL, not a processed photograph
- Preserve the original composition, character poses, and expressions
- Do not add any text, speech bubbles, or watermarks
${ANATOMY_GUARDRAILS}`,

    'dark-fantasy': `Completely redraw this photograph as an action manhwa panel in the style of "Solo Leveling" or "Tower of God". Do not apply a filter — illustrate everything from scratch.

STYLE: Razor-sharp digital inking with high contrast between cool-toned darks and neon accent highlights (blue, purple glow). Characters should look like powerful manhwa protagonists with sharp angular jawlines and intense glowing eyes. Add dynamic energy auras and speed line effects. The color palette is dominated by deep blues, blacks, and electric purple accents.

OUTPUT REQUIREMENTS:
- The result must be a dynamic ACTION MANHWA ILLUSTRATION, not a photo with effects
- Preserve the original composition, character poses, and expressions
- Do not add any text, speech bubbles, or watermarks
${ANATOMY_GUARDRAILS}`,

    'elegant-fantasy': `Completely redraw this photograph as a romance fantasy (rofan) webtoon panel in the style of "Remarried Empress" or "Who Made Me a Princess". Do not apply a filter — illustrate everything from scratch.

STYLE: Delicate thin brownish outlines with idealized beautiful character designs in the shoujo manga tradition. Hair and eyes sparkle like jewels with soft highlights. The color palette centers on pink, gold, pastel purple, and soft whites. Clothing is rendered as elegant flowing fabrics. The background is transformed into a soft floral or palace-like illustrated scene with dreamy bokeh effects.

OUTPUT REQUIREMENTS:
- The result must be a beautiful ROMANCE WEBTOON ILLUSTRATION, not a photo with effects
- Preserve the original composition, character poses, and expressions
- Do not add any text, speech bubbles, or watermarks
${ANATOMY_GUARDRAILS}`,

    'classic-webtoon': `Completely redraw this photograph as a standard Korean webtoon episode panel. Do not apply a filter — illustrate everything from scratch.

STYLE: Clean digital art with bold uniform black outlines around every object and character. Flat cel-shading with simple distinct colors and no complex gradients. Character faces drawn in typical Korean webtoon anime style with slightly exaggerated expressions for readability. The background is simplified into clean illustrated shapes optimized for vertical-scroll mobile reading.

OUTPUT REQUIREMENTS:
- The result must be a 100% ILLUSTRATED COMIC PANEL, not a photo with effects
- Preserve the original composition, character poses, and expressions
- Do not add any text, speech bubbles, or watermarks
${ANATOMY_GUARDRAILS}`,
  };

  return STYLE_PROMPTS[styleId] || customPrompt || `Completely redraw this photograph as a Korean webtoon comic illustration. Do not apply a filter — illustrate everything from scratch.

STYLE: Clean bold black outlines, flat cel-shading colors, Korean webtoon anime-style character faces. Background redrawn as a simplified illustrated scene.

OUTPUT REQUIREMENTS:
- The result must be a 100% ILLUSTRATED DRAWING, not a photo with effects
- Preserve the original composition, character poses, and expressions
- Do not add any text, speech bubbles, or watermarks
${ANATOMY_GUARDRAILS}`;
}

/**
 * Call Gemini API and extract generated image from response.
 * Optionally accepts a style reference image for multi-image consistency.
 * Returns { imageBase64, mimeType } or null if no image was generated.
 */
async function callGemini(
  apiKey: string,
  base64Data: string,
  mimeType: string,
  prompt: string,
  temperature: number,
  styleRef?: { data: string; mimeType: string } | null,
): Promise<{ imageBase64: string; mimeType: string } | null> {
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

  // Build parts: [style reference (optional)] + [source photo] + [prompt]
  const parts: any[] = [];
  if (styleRef) {
    parts.push({ inlineData: { mimeType: styleRef.mimeType, data: styleRef.data } });
  }
  parts.push({ inlineData: { mimeType, data: base64Data } });
  parts.push({ text: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  let geminiRes: Response;
  try {
    geminiRes = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          temperature,
          topP: 0.8,
          topK: 40,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ]
      })
    });
  } catch (fetchError) {
    clearTimeout(timeoutId);
    if ((fetchError as Error).name === 'AbortError') {
      console.error('Gemini API timeout after', GEMINI_TIMEOUT_MS, 'ms');
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!geminiRes.ok) {
    const errorText = await geminiRes.text();
    console.error('Gemini API Error:', errorText);
    return null;
  }

  const geminiData = await geminiRes.json() as any;
  const candidates = geminiData.candidates;
  if (!candidates || candidates.length === 0) return null;

  const responseParts = candidates[0]?.content?.parts || [];
  for (const part of responseParts) {
    if (part.inlineData) {
      return {
        imageBase64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
      };
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API/Start] POST Request received');

    // 1. Parse Request
    let body;
    try {
      body = (await request.json()) as {
        image: string;
        styleId?: string;
        prompt?: string;
        userId?: string;
        styleReference?: string; // base64 data URI of first converted result for consistency
      };
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { image, styleId = 'classic-webtoon', styleReference } = body;
    let prompt = buildPrompt(styleId, body.prompt);

    // If a style reference is provided, prepend consistency instruction
    if (styleReference) {
      prompt = `STYLE CONSISTENCY: The first image provided is a style reference — a previously converted illustration. You MUST match its exact art style, line weight, color palette, and shading technique when redrawing the second image (the photograph). The result should look like it belongs in the same webtoon episode as the reference.\n\n${prompt}`;
    }

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const { env } = getRequestContext();
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Server Config Error: API Key missing' }, { status: 500 });
    }

    // 1b. Rate limit check
    const allowed = await checkRateLimit(env.DB, body.userId || '');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    // 2. Validate and parse base64 image
    const ALLOWED_MIME_TYPES = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
    const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // ~7.5MB decoded

    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) throw new Error('Invalid image format');

    const imageType = base64Match[1].toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(imageType)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    const base64Data = base64Match[2];
    if (base64Data.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Image too large. Please use a smaller image.' }, { status: 413 });
    }

    const mimeType = `image/${imageType}`;

    // 2b. Parse style reference if provided (for multi-image consistency)
    let styleRef: { data: string; mimeType: string } | null = null;
    if (styleReference) {
      const refMatch = styleReference.match(/^data:image\/(\w+);base64,(.+)$/);
      if (refMatch) {
        styleRef = {
          mimeType: `image/${refMatch[1].toLowerCase()}`,
          data: refMatch[2],
        };
      }
    }

    // 3. Call Gemini with retry logic
    let result: { imageBase64: string; mimeType: string } | null = null;
    let retried = false;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      if (isRetry) {
        retried = true;
        console.log(`[API/Start] Retry attempt ${attempt}/${MAX_RETRIES}`);
      }

      // On retry: prepend emphasis and increase temperature for variation
      const attemptPrompt = isRetry
        ? `IMPORTANT: You MUST generate a completely new illustrated image. Do NOT return the original photo or a photo-like result.\n\n${prompt}`
        : prompt;
      const attemptTemperature = isRetry ? 1.2 : 1.0;

      result = await callGemini(apiKey, base64Data, mimeType, attemptPrompt, attemptTemperature, styleRef);

      if (result && result.imageBase64) {
        break;
      }

      // Small delay before retry
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!result || !result.imageBase64) {
      return NextResponse.json({ error: 'Image generation failed after retries. Please try again.' }, { status: 502 });
    }

    // Log successful usage for rate limiting
    await logUsage(env.DB, body.userId || '');

    const outputDataUri = `data:${result.mimeType};base64,${result.imageBase64}`;

    // 4. Return Success
    return NextResponse.json({
      success: true,
      result_url: outputDataUri,
      ...(retried && { retried: true }),
    });

  } catch (error) {
    console.error('API Start Error:', error);
    const msg = (error as Error).message;
    const safeMsg = msg.includes('Invalid image format') ? msg : 'Internal server error';
    return NextResponse.json(
      { error: safeMsg },
      { status: 500 }
    );
  }
}
