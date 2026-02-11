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

// Anti-editing framing: forces the model to treat input as reference, not source to edit
const COMMON_RULES = `Use this photograph ONLY as a composition reference. Do not filter, edit, or overlay it. Create a completely new hand-drawn illustration from scratch where every single element is illustrated artwork: all foreground and background people, the entire environment including sky, ground, walls, streets, furniture, trees, and buildings, and all objects. Zero photographic or photorealistic elements should remain anywhere in the final image. Preserve the exact composition, poses, and expressions with correct anatomy. Produce a clean image with no text, speech bubbles, or watermarks.`;

function buildPrompt(styleId: string): string {
  const STYLE_PROMPTS: Record<string, string> = {
    watercolor: `${COMMON_RULES}

Create a warm hand-painted anime illustration in the style of Studio Ghibli. Draw soft pencil-like outlines with varying thickness and fill every surface — people, objects, sky, ground, walls, every background element — with watercolor washes in warm pastels: peach skin tones, soft greens, sky blues, golden sunlight. The background must be a dreamy illustrated landscape with soft atmospheric perspective. Apply two-tone cel-shading with soft edges throughout. The entire image should feel warm, nostalgic, and peaceful like a Miyazaki film frame.`,

    'cinematic-noir': `${COMMON_RULES}

Create a dark Korean crime thriller manhwa panel in the vein of Bastard or Sweet Home. Draw everything with heavy bold ink strokes and aggressive hatching. Use a palette of blacks, dark grays, muted blues, and occasional blood-red accents. The entire environment — every wall, street, floor, sky, and background element — must be redrawn as dark atmospheric illustration with grain and urban decay textures. Drench the scene in deep shadows with extreme chiaroscuro so roughly seventy percent sits in darkness. All people, whether in foreground or background, must have sharp angular illustrated features and intense narrow eyes.`,

    'dark-fantasy': `${COMMON_RULES}

Create a high-action Korean fantasy manhwa panel in the style of Solo Leveling or Tower of God. Draw razor-sharp digital inking with bold outlines for every person and object, using thinner lines for energy effects. Color the entire scene — all people, all objects, the complete background environment — in rich deep tones with dramatic neon accents in electric blue, purple, and cyan. The background must be a fully illustrated dark atmospheric environment with depth and subtle magical particle effects. Apply multi-layer cel-shading with sharp transitions and dramatic rim lighting to every surface.`,

    'elegant-fantasy': `${COMMON_RULES}

Create a luxury romance fantasy webtoon panel in the style of Remarried Empress or Who Made Me a Princess. Draw every element with delicate thin lines in warm sepia tones and elegant flowing curves. Color the entire scene — all people, all objects, the complete background — in soft rose pinks, champagne golds, lavender, and pearl whites. Draw hair as flowing silky strands with sparkle highlights, eyes as large jewels with multiple highlight layers. The background must be a fully illustrated scene with flower petals, golden bokeh, or palace-like architectural elements. Every surface must be romantic illustrated artwork.`,

    'classic-webtoon': `${COMMON_RULES}

Create a clean modern Korean webtoon panel in the style of True Beauty or Lookism. Draw uniform-weight black outlines around every single element — all foreground and background people, every object, every part of the environment including walls, floors, sky, and furniture. Fill everything with flat solid colors and crisp two-tone cel-shading. Simplify the background into clean illustrated shapes with flat colors and optional screen-tone effects. All faces, whether main character or bystander, must have the characteristic Korean webtoon look with slightly large eyes and clean features.`,
  };

  return STYLE_PROMPTS[styleId] || STYLE_PROMPTS['classic-webtoon'];
}

// Escalating retry prompts for when quality check detects photorealistic remnants
const RETRY_PROMPTS = [
  // Level 1: Targeted feedback
  `CRITICAL: Your previous output still contained photographic or photorealistic elements, especially in the background and surrounding people. This time you MUST completely redraw EVERY element as illustration artwork. The background, sky, ground, all bystanders, and all objects must be fully hand-drawn with visible line art and cel-shading. Absolutely nothing from the original photograph should appear in the output.\n\n`,
  // Level 2: Maximum strength
  `ABSOLUTE REQUIREMENT: Create a 100% hand-drawn illustration. Every single pixel must be artwork — the background, the sky, the ground, every person including bystanders, every object, every surface. Draw clear outlines and apply cel-shading to EVERYTHING. If any area looks like a real photograph, you have failed. Start completely from scratch and draw every element by hand.\n\n`,
];

/**
 * Quality gate: checks if the generated image is fully illustrated
 * Uses Gemini text model (fast) to analyze the output for photorealistic remnants
 */
async function checkIllustrationQuality(
  apiKey: string,
  imageBase64: string,
  imageMimeType: string,
): Promise<{ pass: boolean; score: number }> {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
            { text: 'Rate this image from 1 to 10. Is every part of this image — all people (foreground AND background), the environment, sky, ground, objects — fully illustrated hand-drawn artwork (10)? Or do some areas still look like a real photograph or photorealistic rendering (1)? Look carefully at the background, surrounding/minor people, and environmental textures. Reply with ONLY a single number.' },
          ],
        }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    clearTimeout(timeoutId);
    if (!res.ok) return { pass: true, score: 10 }; // fail open

    const data = await res.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\d+/);
    const score = match ? parseInt(match[0], 10) : 10;

    console.log(`[Quality Check] Score: ${score}/10, raw: "${text.trim()}"`);
    return { pass: score >= 7, score };
  } catch (e) {
    console.warn('[Quality Check] Error, skipping:', e);
    return { pass: true, score: 10 }; // fail open
  }
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

    // If a style reference is provided, add consistency instruction
    if (styleReference) {
      prompt = `The first image is a style reference from this same series. Match its exact line art weight, color palette, shading technique, and face-drawing style so the result looks like it was drawn by the same artist.

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

    // 3. Call Gemini with retry logic + quality gate
    let result: { imageBase64: string; mimeType: string } | null = null;
    let retried = false;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const isRetry = attempt > 0;
      if (isRetry) {
        retried = true;
        console.log(`[API/Start] Retry attempt ${attempt}/${MAX_RETRIES}`);
      }

      // Escalating prompts: base → targeted feedback → maximum strength
      const attemptPrompt = isRetry
        ? (RETRY_PROMPTS[attempt - 1] || RETRY_PROMPTS[RETRY_PROMPTS.length - 1]) + prompt
        : prompt;

      // Temperature: base 0.8, lower with style ref, slightly higher on retry
      let attemptTemperature = 0.8;
      if (styleRef) attemptTemperature = 0.6;
      if (isRetry) attemptTemperature = 1.0;

      result = await callGemini(apiKey, base64Data, mimeType, attemptPrompt, attemptTemperature, styleRef);

      if (!result?.imageBase64) {
        // No image at all — wait and retry
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      // Quality gate: check if the output is fully illustrated (skip on final attempt)
      if (attempt < MAX_RETRIES) {
        const quality = await checkIllustrationQuality(apiKey, result.imageBase64, result.mimeType);
        if (quality.pass) {
          console.log(`[API/Start] Quality check passed (score: ${quality.score})`);
          break;
        }
        console.log(`[API/Start] Quality check failed (score: ${quality.score}), retrying...`);
        result = null; // force retry
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
