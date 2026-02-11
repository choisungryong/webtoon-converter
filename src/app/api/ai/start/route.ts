import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getUserFromRequest } from '../../../../lib/auth';
import { checkAndDeductCredits, refundCredits, CREDIT_COSTS } from '../../../../lib/credits';

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

// ============ Prompt Engineering ============

const COMMON_RULES = `Render the entire scene — every element including characters, objects, and the full background — as a hand-drawn illustration from scratch. Preserve the exact composition, poses, expressions, and aspect ratio of the original photograph. Keep anatomy correct with proper proportions, and produce a clean image with no text, speech bubbles, or watermarks.`;

function buildPrompt(styleId: string): string {
  const STYLE_PROMPTS: Record<string, string> = {
    watercolor: `Transform this photograph into a warm, hand-painted anime illustration inspired by Studio Ghibli films. Use soft pencil-like outlines with varying thickness and fill every surface with watercolor washes in warm pastels — peach skin tones, soft greens, sky blues, and golden sunlight. The background should be reimagined as a dreamy illustrated landscape with soft atmospheric perspective, not a filtered version of the photo. Apply simple two-tone cel-shading with soft edges to give the entire image a warm, nostalgic feel reminiscent of a Miyazaki film frame. ${COMMON_RULES}`,

    'cinematic-noir': `Transform this photograph into a dark Korean crime thriller manhwa panel in the vein of Bastard or Sweet Home. Use heavy bold ink strokes with aggressive hatching, keeping the palette almost entirely in blacks, dark grays, and muted blues with occasional blood-red accents. Drench the illustrated background in deep shadows using extreme chiaroscuro so that roughly seventy percent of the scene sits in darkness. Faces should have sharp angular features and intense narrow eyes. The entire environment — walls, streets, sky — must be redrawn as dark atmospheric illustration with grain and urban decay textures. ${COMMON_RULES}`,

    'dark-fantasy': `Transform this photograph into a high-action Korean fantasy manhwa panel in the style of Solo Leveling or Tower of God. Use razor-sharp digital inking with bold outlines for characters and thinner lines for energy effects, coloring everything in rich deep tones with dramatic neon accents in electric blue, purple, and cyan. Redraw the background as a dark atmospheric illustrated environment with depth and subtle magical particle effects. Apply multi-layer cel-shading with sharp transitions and dramatic rim lighting to give the scene an epic, cinematic power. ${COMMON_RULES}`,

    'elegant-fantasy': `Transform this photograph into a luxury romance fantasy webtoon panel in the style of Remarried Empress or Who Made Me a Princess. Use delicate thin lines in warm sepia tones with elegant flowing curves, and color the entire scene in soft rose pinks, champagne golds, lavender, and pearl whites. Hair should flow in silky strands with sparkle highlights, and eyes should be large and jewel-like with multiple highlight layers. Reimagine the background as a soft-focus illustrated scene with flower petals, golden bokeh, or palace-like architectural elements. The overall aesthetic should feel beautiful, romantic, and dreamy. ${COMMON_RULES}`,

    'classic-webtoon': `Transform this photograph into a clean modern Korean webtoon panel in the style of True Beauty or Lookism. Use uniform-weight black outlines around every element — characters, objects, and the entire background — and fill them with flat solid colors and simple two-tone cel-shading with crisp edges. Simplify the background into clean illustrated shapes with flat colors, optionally adding screen-tone effects. Faces should have the characteristic Korean webtoon look with slightly large eyes, small noses, and expressive clean features. The result should look professional and optimized for mobile vertical scrolling. ${COMMON_RULES}`,
  };

  return STYLE_PROMPTS[styleId] || STYLE_PROMPTS['classic-webtoon'];
}

/**
 * Call Gemini API and extract generated image from response.
 * Uses TEXT+IMAGE modalities so the model can reason about style before generating.
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
    parts.push({ text: 'Style reference — match this art style exactly:' });
    parts.push({ inlineData: { mimeType: styleRef.mimeType, data: styleRef.data } });
    parts.push({ text: 'Source photograph — redraw this in the above style:' });
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
          responseModalities: ['TEXT', 'IMAGE'],
          temperature,
          imageConfig: {
            personGeneration: 'ALLOW_ALL',
          },
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
    let prompt = buildPrompt(styleId);

    // If a style reference is provided, add strong consistency instruction
    if (styleReference) {
      prompt = `The first image is a style reference from this same series. Match its exact line art weight, color palette, shading technique, level of detail, and face-drawing style so the result looks like it was drawn by the same artist in the same session.

${prompt}`;
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

    // 1c. Credit check
    let authUser: any = null;
    try { authUser = await getUserFromRequest(request, env); } catch { /* optional */ }
    const creditResult = await checkAndDeductCredits(env.DB, {
      userId: authUser?.id || null,
      legacyUserId: body.userId || '',
      isAuthenticated: !!authUser,
      cost: CREDIT_COSTS.basic_convert,
      reason: 'basic_convert',
    });
    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error || 'INSUFFICIENT_CREDITS' },
        { status: 402 }
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

      const attemptPrompt = isRetry
        ? `Generate a fully illustrated version of this photograph where every part of the image — characters, objects, and the entire background — is clearly hand-drawn artwork.\n\n${prompt}`
        : prompt;

      // Lower temperature when style reference present for consistency
      // Higher on retry for more variation
      let attemptTemperature = 0.8;
      if (styleRef) attemptTemperature = 0.6; // More deterministic for consistency
      if (isRetry) attemptTemperature = 1.0; // More creative on retry

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
      // Refund credits on failure
      if (authUser?.id) {
        try { await refundCredits(env.DB, authUser.id, CREDIT_COSTS.basic_convert, 'basic_convert_refund'); } catch { /* best effort */ }
      }
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
