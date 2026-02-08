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

// ============ Prompt Engineering ============

const COMMON_RULES = `
CRITICAL RULES (MUST FOLLOW):
1. You are an ILLUSTRATOR, not a photo editor. DRAW everything from scratch.
2. DO NOT paste, composite, or filter the original photo in any way.
3. DO NOT return a photorealistic or photo-like image. The output must look hand-drawn.
4. Preserve the exact same composition, poses, facial expressions, and number of people.
5. Do NOT add any text, speech bubbles, logos, or watermarks.
6. Correct human anatomy: 5 fingers per hand, proper proportions, no extra limbs.
7. Maintain the original photo's aspect ratio and framing.`;

function buildPrompt(styleId: string): string {
  const STYLE_PROMPTS: Record<string, string> = {
    watercolor: `TASK: Redraw this photograph as a hand-painted anime illustration in the style of Studio Ghibli films.

ART STYLE SPECIFICATION:
- Line art: Soft, gentle pencil-like outlines with varying thickness (thin for details, thicker for silhouettes)
- Coloring: Soft watercolor washes with warm pastel tones — peach skin, warm yellows, soft greens, sky blues
- Shading: Simple 2-tone cel-shading with soft edges, NO photographic gradients or realistic skin textures
- Eyes: Large, round, expressive anime-style eyes with highlight dots
- Hair: Simplified into flowing clumped strands with soft color gradients
- Background: Reimagined as a dreamy, simplified illustrated landscape with soft atmospheric perspective
- Overall feel: Warm, nostalgic, peaceful — like a frame from a Miyazaki film

COLOR PALETTE: Warm pastels — #F4E4C9 (skin), #8CC084 (nature), #87CEEB (sky), #FFD700 (warm light), #E8A87C (blush)
${COMMON_RULES}`,

    'cinematic-noir': `TASK: Redraw this photograph as a dark Korean crime thriller manhwa panel, similar to "Bastard" or "Sweet Home".

ART STYLE SPECIFICATION:
- Line art: Heavy, bold black ink strokes with sharp angular lines and aggressive hatching for shadows
- Coloring: Very limited desaturated palette — mostly blacks, dark grays, muted blues, with occasional red accents
- Shading: Extreme chiaroscuro — 70% of the image should be deep shadows, dramatic directional lighting
- Faces: Sharp angular features, intense narrow eyes, defined jawlines, minimal expression lines for tension
- Background: Dark atmospheric environments with drawn rain/grain effects, urban decay elements
- Overall feel: Tense, oppressive, dangerous — like a Korean noir thriller

COLOR PALETTE: Dark and desaturated — #1A1A2E (deep dark), #16213E (dark blue), #0F3460 (midnight), #E94560 (blood red accent), #2C2C2C (shadow)
${COMMON_RULES}`,

    'dark-fantasy': `TASK: Redraw this photograph as a high-action Korean fantasy manhwa panel, similar to "Solo Leveling" or "Tower of God".

ART STYLE SPECIFICATION:
- Line art: Razor-sharp precise digital inking with dynamic line weight variation — bold for characters, thin for energy effects
- Coloring: Rich deep colors with dramatic neon accent glows — electric blue, purple, cyan energy effects
- Shading: Multi-layer cel-shading with sharp transitions, dramatic rim lighting, volumetric light effects
- Characters: Sharp angular features, intense glowing eyes, powerful confident expressions, stylized proportions
- Effects: Add subtle energy aura glow around characters, faint speed lines or particle effects in background
- Background: Dark atmospheric with depth, complementary cool tones, subtle magical particle effects
- Overall feel: Powerful, epic, cinematic — like a key action scene from a popular manhwa

COLOR PALETTE: Dark with neon accents — #0D0D2B (deep dark), #4361EE (electric blue), #7B2FF7 (purple glow), #00D4FF (cyan), #1A1A3E (dark base)
${COMMON_RULES}`,

    'elegant-fantasy': `TASK: Redraw this photograph as a luxury romance fantasy (rofan) webtoon panel, similar to "Remarried Empress" or "Who Made Me a Princess".

ART STYLE SPECIFICATION:
- Line art: Delicate, thin lines in warm brown/sepia tones (NOT black), elegant flowing curves
- Coloring: Soft luxurious palette — rose pink, champagne gold, lavender, pearl white, soft cream
- Shading: Gentle gradient shading with soft sparkle/glitter effects on hair and eyes
- Eyes: Large jewel-like eyes with multiple highlight layers and color reflections, long detailed eyelashes
- Hair: Flowing silky strands with individual highlight streaks, slight sparkle effects
- Clothing: Elegant and detailed, rendered as flowing luxurious fabrics with soft folds
- Background: Soft focus with flower petals, golden bokeh, or palace-like architectural elements
- Overall feel: Beautiful, romantic, dreamy — like a high-production rofan webtoon

COLOR PALETTE: Romantic luxury — #F8C8DC (rose pink), #FFD700 (gold), #E6E6FA (lavender), #FFF5EE (cream), #DDA0DD (plum)
${COMMON_RULES}`,

    'classic-webtoon': `TASK: Redraw this photograph as a standard modern Korean webtoon panel, like "True Beauty" or "Lookism".

ART STYLE SPECIFICATION:
- Line art: Clean, uniform-weight black outlines around every object, character, and background element
- Coloring: Flat solid colors with clear distinct fills, NO complex gradients — simple and clean
- Shading: 2-tone flat cel-shading with crisp hard edges between light and shadow areas
- Faces: Korean webtoon anime-style — slightly large eyes, small nose, expressive but clean features
- Hair: Simplified into distinct flat-colored sections with minimal internal detail
- Background: Simplified and cleaned up, using flat colors and basic shapes, screen-tone effects optional
- Overall feel: Clean, readable, professional — optimized for mobile vertical scrolling

COLOR PALETTE: Clean and vibrant — use the dominant colors from the original photo, simplified into flat fills with good contrast
${COMMON_RULES}`,
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
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;

  // Build parts: [style reference (optional)] + [source photo] + [prompt]
  const parts: any[] = [];

  if (styleRef) {
    // Style reference image comes first with clear label
    parts.push({ text: '[STYLE REFERENCE IMAGE - match this exact art style]:' });
    parts.push({ inlineData: { mimeType: styleRef.mimeType, data: styleRef.data } });
    parts.push({ text: '[SOURCE PHOTOGRAPH - redraw this in the above style]:' });
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
          // Allow TEXT+IMAGE so model can reason about style before drawing
          responseModalities: ['TEXT', 'IMAGE'],
          temperature,
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
      prompt = `STYLE CONSISTENCY REQUIREMENT (HIGHEST PRIORITY):
The first image is a style reference — a previously converted illustration from this same series.
You MUST exactly replicate:
- The same line art thickness and style
- The same color palette and saturation level
- The same shading technique (number of tones, edge hardness)
- The same level of detail and simplification
- The same eye/face drawing style
The result MUST look like it was drawn by the same artist in the same session.

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
        ? `IMPORTANT: Your previous attempt was rejected. You MUST generate a completely new ILLUSTRATED image that is clearly hand-drawn art, NOT a photograph or photo filter.\n\n${prompt}`
        : prompt;

      // Lower temperature when style reference present for consistency
      // Higher on retry for more variation
      let attemptTemperature = 1.0;
      if (styleRef) attemptTemperature = 0.8; // More deterministic for consistency
      if (isRetry) attemptTemperature = 1.2; // More creative on retry

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
