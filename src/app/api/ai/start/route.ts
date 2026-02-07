import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'alive',
    message: 'Gemini API Worker is Running (Synchronous Mode)',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API/Start] POST Request received');

    // Anatomical Rules & Prompts
    const ANATOMICAL_RULES = `
[STRICT] ABSOLUTE ANATOMICAL RULES (NEVER VIOLATE):
- EXACTLY 2 arms per person, EXACTLY 2 legs per person
- EXACTLY 2 hands with 5 fingers each, EXACTLY 2 feet per person
- NORMAL human body proportions (no elongated torso, limbs, or distorted parts)
- NO extra limbs, NO missing limbs, NO merged body parts
- If body part is hidden in original, keep it hidden - do NOT invent wrong anatomy

[STRICT] ANTI-CROPPING RULES:
- EVERY character must fit FULLY within the frame (head to toe visible)
- NO cutting off heads at top or feet at bottom
- Maintain the SAME framing as original - do NOT add incorrect body parts`;

    const STYLE_PROMPTS: Record<string, string> = {
      watercolor: `TRANSFORM THIS IMAGE INTO A PURE 2D GHIBLI-STYLE ILLUSTRATION.
${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1. **REMOVE ALL PHOTOREALISM**: The output must look like a HAND-DRAWN PAINTING, not a filtered photo.
2. **FLATTEN SHADING**: Use cel-shading and watercolor washes. NO realistic gradients or skin textures.
3. **SIMPLIFY DETAILS**: Reduce complex photo details into clean, stylized shapes.
4. **RE-IMAGINE THE BACKGROUND**: Redraw the background freely in a lush, Miyazaki-esque style. Do not just trace the photo.

STYLE GUIDE:
-   **Line Art**: Soft pencil-like outlines.
-   **Colors**: Pastel, vibrant, "Studio Ghibli" palette.
-   **Eyes**: Large, expressive anime eyes.
-   **Hair**: Clumped, stylized hair strands, not individual realistic hairs.

Output is a DRAWING, not a photo.`,

      'cinematic-noir': `TRANSFORM THIS IMAGE INTO A GRITTY KOREAN THRILLER WEBTOON PANEL.
${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1. **REMOVE REALISTIC TEXTURES**: Skin should be smooth flat color, clothes should be solid blocks of shadow/light.
2. **INKING**: Apply heavy, bold black ink lines (Manhwa style). No soft photo edges.
3. **DRAMATIC RE-LIGHTING**: Change the lighting to be harsh and cinematic (Chiaroscuro). Ignore the original photo's flat lighting if necessary.
4. **ATMOSPHERE**: Add film grain, rain, or fog effects that are DRAWN, not realistic.

STYLE GUIDE:
-   **Vibe**: Dark, tense, "files of the deceased" or "Signal" webtoon style.
-   **Shadows**: Pitch black shadows.

Output is a WEBTOON PANEL, not a processed photo.`,

      'dark-fantasy': `TRANSFORM THIS IMAGE INTO A SOLO LEVELING STYLE MANHWA PANEL.
${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1. **COMPLETE RE-DRAW**: The character must look like a hunter/awakener from a manhwa.
2. **EFFECTS OVER REALISM**: Add magical auras (blue/purple glow) and speed lines.
3. **SHARP ANGLES**: Jawlines, armor, and clothes should be sharp and angular, not soft/realistic.
4. **EYES**: Glowing eyes or intense sharp anime eyes.

STYLE GUIDE:
-   **Line Work**: Razor-sharp digital inking.
-   **Color**: High contrast, cool tones, neon accents.

Output is an ACTION MANHWA SCENE, not a photo.`,

      'elegant-fantasy': `TRANSFORM THIS IMAGE INTO A ROMANCE FANTASY (ROFAN) WEBTOON PANEL.
${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1. **IDEALIZE EVERYTHING**: Make characters incredibly beautiful (shoujo manga style). Remove all realistic skin imperfections.
2. **SHINY AESTHETIC**: Hair and eyes should sparkle (jewel eyes). Add "shalala" effects.
3. **COSTUME UPGRADE**: Simplify messy clothes into elegant, flowing fabrics.
4. **BACKGROUND**: Turn the background into a soft, floral or palace-like illustration.

STYLE GUIDE:
-   **Colors**: Pink, gold, pastel purple, soft whites.
-   **Lines**: Delicate, thin, brownish lines.

Output is a ROMANCE COMIC, not a photo.`,

      'classic-webtoon': `TRANSFORM THIS IMAGE INTO A STANDARD KOREAN WEBTOON EPISODE PANEL.
${ANATOMICAL_RULES}

CRITICAL "HIGH DENOISING" INSTRUCTIONS:
1. **FLAT COLORS**: Use simple, flat distinct colors (Cell Shading). No complex gradients.
2. **BOLD OUTLINES**: Every object and person must have a clear BLACK outline.
3. **CARTOON PROPORTIONS**: Slightly exaggerate expressions for readability.
4. **CLEAN LOOK**: Remove all visual noise from the photo.

STYLE GUIDE:
-   **Simplicity**: Optimize for mobile readability.
-   **Faces**: Standard webtoon anime faces.

Output is a COMIC STRIP PANEL, not a photo.`,
    };

    const DEFAULT_PROMPT = `Transform this ENTIRE photo into a Korean webtoon comic illustration. 
${ANATOMICAL_RULES}
DRAW EVERY PERSON as cartoon characters. REDRAW THE ENTIRE BACKGROUND with bold outlines. EVERY element must be illustrated. DO NOT add text or speech bubbles. DO NOT create anatomical errors.`;

    // 1. Parse Request
    let body;
    try {
      body = (await request.json()) as {
        image: string;
        styleId?: string;
        prompt?: string;
        userId?: string;
      };
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { image, styleId = 'classic-webtoon' } = body;
    const prompt = STYLE_PROMPTS[styleId] || body.prompt || DEFAULT_PROMPT;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const { env } = getRequestContext();
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Server Config Error: API Key missing' }, { status: 500 });
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
          temperature: 0.85,
          topP: 0.99,
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

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error('Gemini API Error:', errorText);
      return NextResponse.json({ error: 'Image generation failed. Please try again.' }, { status: 502 });
    }

    const geminiData = await geminiRes.json() as any;
    const candidates = geminiData.candidates;
    if (!candidates || candidates.length === 0) return NextResponse.json({ error: 'No image generated' }, { status: 500 });

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

    if (!generatedImageBase64) return NextResponse.json({ error: 'Gemini returned no image data' }, { status: 500 });

    const outputDataUri = `data:${generatedMimeType};base64,${generatedImageBase64}`;

    // 3. Return Success Directly
    return NextResponse.json({
      success: true,
      result_url: outputDataUri
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
