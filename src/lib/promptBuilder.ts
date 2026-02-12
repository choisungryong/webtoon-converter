/**
 * 5-Step LOCK Prompt Builder
 * Adapted from storycut's 7-Step LOCK architecture for photo→illustration conversion.
 *
 * Step order (text always before images):
 * [1] VISUAL IDENTITY LOCK — role assignment + full-redraw declaration
 * [2] STYLE ANCHOR — first converted frame (video/multi-photo only)
 * [3] SCENE ELEMENTS TO REDRAW — pre-analyzed people/environment
 * [4] STRICT RULES — prohibition patterns
 * [5] Style prompt + COMPOSITION REFERENCE + source photo
 */

import type { GeminiPart, SceneAnalysis } from '../types';

// ─── Step 1: Visual Identity Lock ───────────────────────────────────────────

const VISUAL_IDENTITY_LOCK = `[VISUAL IDENTITY LOCK]
You are a professional Korean webtoon illustrator. You will create a BRAND NEW hand-drawn illustration from scratch.
You MUST redraw EVERY element — every person (foreground AND background), every object, the entire environment (sky, ground, walls, streets, buildings, trees, furniture) — as fully illustrated artwork.
No element may retain a photographic appearance. Every single pixel of the output must be hand-drawn illustration with visible line art and cel-shading.
This is NOT a photo edit — this is a complete artistic recreation.

CRITICAL — TWO COMMON FAILURES YOU MUST AVOID:
1. PEOPLE: You must convert ALL people in the scene, not just one. If there are 3 people, all 3 must become illustrations. A result where only the main character is illustrated = FAILURE.
2. ENVIRONMENT: You must redraw the ENTIRE background — walls, floor, sky, street, buildings, furniture, trees. A common mistake is converting the people but leaving the background as a blurred or darkened photograph. Photographic backgrounds are easy to spot: they have camera noise, lens blur, photographic lighting gradients, or real-world textures. Replace ALL of these with flat colors, drawn textures, line art, or painted strokes. If the background could pass as a photograph, it is WRONG.`;

// ─── Step 4: Strict Rules ───────────────────────────────────────────────────

const STRICT_RULES = `[STRICT RULES — VIOLATIONS WILL FAIL QUALITY CHECK]
• ABSOLUTELY NOT photorealistic — no surface, person, or area may look like a real photograph
• ALL background people/bystanders must have drawn outlines and cel-shading — they are NOT optional
• If there are N people in the reference photo, ALL N must be converted to illustration — converting only 1 person is a FAILURE
• Photographic skin texture on ANY person = FAILURE. Every person needs drawn skin with cel-shading.
• The ENTIRE background must be redrawn: sky, ground, walls, streets, buildings, furniture, trees — ALL with illustrated textures or flat colors
• Blurred backgrounds, dark out-of-focus areas, and camera bokeh are STILL photographs — replace them with drawn/painted equivalents
• Photographic camera noise, lens flare, or lighting gradients on any surface = FAILURE
• Preserve exact composition, poses, expressions, and number of people with correct anatomy
• Produce a clean image: no text, speech bubbles, or watermarks`;

// ─── Style Prompts ──────────────────────────────────────────────────────────

const STYLE_PROMPTS: Record<string, string> = {
  watercolor: `[STYLE: WARM WATERCOLOR]
Create a warm hand-painted anime illustration in the style of Studio Ghibli. Draw soft pencil-like outlines with varying thickness and fill every surface — people, objects, sky, ground, walls, every background element — with watercolor washes in warm pastels: peach skin tones, soft greens, sky blues, golden sunlight. The background must be a dreamy illustrated landscape with soft atmospheric perspective. Apply two-tone cel-shading with soft edges throughout. The entire image should feel warm, nostalgic, and peaceful like a Miyazaki film frame.
REMINDER: Every background bystander, the sky, the ground, walls, and all surfaces must be fully painted in watercolor style — zero photographic remnants.`,

  'cinematic-noir': `[STYLE: CINEMATIC NOIR]
Create a dark Korean crime thriller manhwa panel in the vein of Bastard or Sweet Home.
WARNING: Dark photos trick you into thinking they are already illustrated — they are NOT. You must redraw EVERYTHING from scratch regardless of how dark or moody the original photo looks.
Draw everything with heavy bold ink strokes and aggressive hatching. Use a palette of blacks, dark grays, muted blues, and occasional blood-red accents. The entire environment — every wall, street, floor, sky, and background element — must be redrawn as dark atmospheric illustration with grain and urban decay textures. Drench the scene in deep shadows with extreme chiaroscuro so roughly seventy percent sits in darkness.
EVERY PERSON IN THE SCENE — whether foreground main character, background bystander, or partially visible passerby — must have sharp angular illustrated features with bold ink outlines and hatching. Do NOT leave any person looking like a real photograph. If there are 5 people in the scene, all 5 must be fully redrawn as ink illustrations.
REMINDER: A dark photograph is NOT the same as a dark illustration. Every surface must show ink texture, hatching, or drawn marks — no photographic skin, no photographic fabric, no photographic walls.`,

  'dark-fantasy': `[STYLE: DARK FANTASY MANHWA]
Create a high-action Korean fantasy manhwa panel in the style of Solo Leveling or Tower of God.
WARNING: Dark photos trick you into thinking they are already illustrated — they are NOT. You must redraw EVERYTHING from scratch regardless of how dark or dramatic the original photo looks.
Draw razor-sharp digital inking with bold outlines for EVERY person and object, using thinner lines for energy effects. Color the entire scene — all people, all objects, the complete background environment — in rich deep tones with dramatic neon accents in electric blue, purple, and cyan. The background must be a fully illustrated dark atmospheric environment with depth and subtle magical particle effects. Apply multi-layer cel-shading with sharp transitions and dramatic rim lighting to every surface.
EVERY PERSON IN THE SCENE — whether foreground main character, background bystander, or partially visible passerby — must have bold digital outlines, cel-shading, and fantasy-style features. Do NOT leave any person looking like a real photograph. If there are 5 people in the scene, all 5 must be fully redrawn as manhwa illustrations.
REMINDER: A dark photograph is NOT a dark illustration. Every skin surface must show cel-shading, every fabric must show drawn folds, every wall/floor/sky must show illustrated textures — no photographic elements anywhere.`,

  'elegant-fantasy': `[STYLE: ELEGANT ROMANCE FANTASY]
Create a luxury romance fantasy webtoon panel in the style of Remarried Empress or Who Made Me a Princess. Draw every element with delicate thin lines in warm sepia tones and elegant flowing curves. Color the entire scene — all people, all objects, the complete background — in soft rose pinks, champagne golds, lavender, and pearl whites. Draw hair as flowing silky strands with sparkle highlights, eyes as large jewels with multiple highlight layers. The background must be a fully illustrated scene with flower petals, golden bokeh, or palace-like architectural elements.
REMINDER: All background people must be drawn in the same elegant style, and the entire environment must be rendered as soft illustrated artwork — no photographic surfaces.`,

  'classic-webtoon': `[STYLE: CLASSIC KOREAN WEBTOON]
Create a clean modern Korean webtoon panel in the style of True Beauty or Lookism. Draw uniform-weight black outlines around every single element — all foreground and background people, every object, every part of the environment including walls, floors, sky, and furniture. Fill everything with flat solid colors and crisp two-tone cel-shading. Simplify the background into clean illustrated shapes with flat colors and optional screen-tone effects. All faces, whether main character or bystander, must have the characteristic Korean webtoon look with slightly large eyes and clean features.
REMINDER: Every person in the scene including those in the background must have clean black outlines, and the entire environment must be flat-colored illustration — no photographic elements.`,
};

// ─── Retry Prompts ──────────────────────────────────────────────────────────

export const RETRY_PROMPTS = [
  `[FAILED QUALITY CHECK — ATTEMPT 2]
Your previous output FAILED for TWO reasons:
PROBLEM 1 — PEOPLE: You converted the main character but left other people looking like real photographs with real skin/hair/clothing.
PROBLEM 2 — ENVIRONMENT: The background still looks like a photograph — it has camera noise, photographic blur, or real-world textures instead of drawn/painted surfaces.
THIS ATTEMPT MUST FIX BOTH:
1. Count EVERY person in the reference photo. EVERY SINGLE ONE must be redrawn as illustration with outlines and cel-shading.
2. The background is NOT optional: redraw EVERY surface — sky, ground, walls, streets, buildings, furniture — with flat colors, drawn line art, or painted textures. No blurred photographic backgrounds.
3. Check your output: zoom into the background. If it has camera noise, lens blur, or photographic gradients, it is WRONG.
Start from scratch and ensure zero photographic remnants anywhere.

`,
  `[SECOND FAILED QUALITY CHECK — FINAL ATTEMPT]
STILL FAILING: People and/or environment remain photographic.
You MUST create a 100% hand-drawn illustration where every single pixel is artwork.
PEOPLE: Draw thick visible outlines around EVERY person — main character AND every bystander. ZERO photographic skin/hair/clothing.
ENVIRONMENT: Fill EVERY surface — sky, ground, walls, roads, buildings — with flat illustrated colors and drawn textures. Even dark or blurry areas must be repainted as illustration. A darkened photo background is NOT an illustrated background.
If any person or any background area could be mistaken for a photograph, you have FAILED.
Redraw the ENTIRE scene from scratch as a cartoon/manhwa illustration.

`,
];

// ─── Premium Prompts ────────────────────────────────────────────────────────

const PREMIUM_FROM_ORIGINAL = `[STYLE: PREMIUM CINEMATIC WEBTOON]
Create a premium Korean webtoon illustration at the highest quality level. Draw every person including ALL background bystanders and passersby, every object, and the ENTIRE environment using razor-sharp digital inking with professional line weight variation, rich cinematic color grading, and multi-layer cel-shading with dramatic volumetric shadows and rim lighting. Render eyes as large expressive jewels with multiple highlight layers, hair with individual strand groups and light reflections, clothing with intricate fabric folds. The background must be a fully illustrated environment with atmospheric perspective, depth of field, and cinematic lighting — like a key visual from Solo Leveling, Omniscient Reader, or True Beauty. Every single pixel must be hand-drawn artwork.
REMINDER: Background people must be drawn with the same level of detail as foreground people — no photographic surfaces, textures, or people anywhere.`;

const PREMIUM_UPGRADE = `Enhance this webtoon illustration to premium production quality while preserving the exact composition, characters, poses, and scene. Sharpen and refine all linework with professional weight variation, enrich colors with deeper saturation and better contrast, add multi-layer cel-shading with cinematic lighting, dramatic shadows, and rim light accents. Redraw the background with atmospheric depth, added detail, and depth of field effects. Fix any anatomy issues to ensure correct human proportions and proper finger counts. Produce a clean image with no text, speech bubbles, or watermarks.`;

export const PREMIUM_RETRY_PROMPTS = [
  `[FAILED QUALITY CHECK — ATTEMPT 2]
Your previous output left background people and environmental surfaces looking like real photographs.
THIS ATTEMPT MUST FIX: (1) Redraw ALL background bystanders with visible outlines and cel-shading. (2) Redraw the ENTIRE sky, ground, walls, streets with illustrated textures. (3) Every surface needs drawn outlines — zero photographic remnants.

`,
  `[SECOND FAILED QUALITY CHECK — FINAL ATTEMPT]
Background people and environment are STILL photographic. Create a 100% hand-drawn illustration where every pixel is artwork. Draw thick visible outlines around EVERY person including distant bystanders. Fill EVERY surface with flat illustrated colors. Redraw the ENTIRE scene from scratch as manhwa illustration.

`,
];

// ─── Scene Analysis Formatting ──────────────────────────────────────────────

function formatSceneAnalysis(analysis: SceneAnalysis): string {
  const lines: string[] = ['[SCENE ELEMENTS TO REDRAW — do NOT skip any of these]'];

  if (analysis.people.length > 0) {
    lines.push(`\nPEOPLE (${analysis.people.length} total — ALL must be redrawn as illustrations):`);
    for (const person of analysis.people) {
      const roleLabel = person.role === 'main' ? 'MAIN CHARACTER' : 'BYSTANDER';
      lines.push(`  • [${roleLabel}] ${person.description} — position: ${person.position}`);
    }
  }

  if (analysis.environment.surfaces.length > 0) {
    lines.push(`\nENVIRONMENT (ALL surfaces must be redrawn):
  Description: ${analysis.environment.description}
  Lighting: ${analysis.environment.lighting}
  Surfaces to redraw:`);
    for (const surface of analysis.environment.surfaces) {
      lines.push(`    • ${surface}`);
    }
  }

  if (analysis.colorPalette.length > 0) {
    lines.push(`\nDOMINANT COLORS (maintain these in illustrated form): ${analysis.colorPalette.join(', ')}`);
  }

  return lines.join('\n');
}

// ─── Main Builder: Basic Conversion ─────────────────────────────────────────

export interface BuildPromptOptions {
  styleId: string;
  styleRef?: { data: string; mimeType: string } | null;
  sceneAnalysis?: SceneAnalysis | null;
  retryLevel?: number; // 0 = first attempt, 1+ = retry
}

/**
 * Build the full parts array for Gemini API in 5-Step LOCK order.
 * Returns [parts, temperature].
 */
export function buildBasicPromptParts(
  sourceBase64: string,
  sourceMimeType: string,
  options: BuildPromptOptions,
): { parts: GeminiPart[]; temperature: number } {
  const { styleId, styleRef, sceneAnalysis, retryLevel = 0 } = options;
  const parts: GeminiPart[] = [];
  const isRetry = retryLevel > 0;

  // ── Retry prefix (if applicable) ──
  if (isRetry) {
    const retryPrompt = RETRY_PROMPTS[Math.min(retryLevel - 1, RETRY_PROMPTS.length - 1)];
    parts.push({ text: retryPrompt });
  }

  // ── Step 1: Visual Identity Lock ──
  parts.push({ text: VISUAL_IDENTITY_LOCK });

  // ── Step 2: Style Anchor (if available) ──
  if (styleRef) {
    parts.push({ text: '\n[STYLE ANCHOR — match this exact art style, line weight, color palette, and shading technique]:' });
    parts.push({ inlineData: { mimeType: styleRef.mimeType, data: styleRef.data } });
  }

  // ── Step 3: Scene Elements (if pre-analyzed) ──
  if (sceneAnalysis && sceneAnalysis.people.length > 0) {
    parts.push({ text: '\n' + formatSceneAnalysis(sceneAnalysis) });
  }

  // ── Step 4: Strict Rules ──
  parts.push({ text: '\n' + STRICT_RULES });

  // ── Step 5: Style Prompt + Composition Reference + Source ──
  const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS['classic-webtoon'];
  parts.push({ text: '\n' + stylePrompt });

  parts.push({ text: '\n[COMPOSITION REFERENCE — redraw this ENTIRE scene from scratch as illustration]:' });
  parts.push({ inlineData: { mimeType: sourceMimeType, data: sourceBase64 } });

  // Temperature: lower for consistency, higher for retries
  let temperature = 0.5;
  if (styleRef) temperature = 0.4;
  if (isRetry) temperature = 0.8;

  return { parts, temperature };
}

// ─── Main Builder: Premium Conversion ───────────────────────────────────────

export interface BuildPremiumPromptOptions {
  usedOriginal: boolean;
  storyDirection?: string;
  sceneAnalysis?: SceneAnalysis | null;
  retryLevel?: number;
}

export function buildPremiumPromptParts(
  sourceBase64: string,
  sourceMimeType: string,
  options: BuildPremiumPromptOptions,
): { parts: GeminiPart[]; temperature: number } {
  const { usedOriginal, storyDirection, sceneAnalysis, retryLevel = 0 } = options;
  const parts: GeminiPart[] = [];
  const isRetry = retryLevel > 0;

  // ── Retry prefix ──
  if (isRetry) {
    const retryPrompt = PREMIUM_RETRY_PROMPTS[Math.min(retryLevel - 1, PREMIUM_RETRY_PROMPTS.length - 1)];
    parts.push({ text: retryPrompt });
  }

  // ── Step 1: Visual Identity Lock ──
  parts.push({ text: VISUAL_IDENTITY_LOCK });

  // ── Step 3: Scene Elements (if available) ──
  if (sceneAnalysis && sceneAnalysis.people.length > 0) {
    parts.push({ text: '\n' + formatSceneAnalysis(sceneAnalysis) });
  }

  // ── Step 4: Strict Rules ──
  if (usedOriginal) {
    parts.push({ text: '\n' + STRICT_RULES });
  }

  // ── Step 5: Premium Style Prompt ──
  const premiumPrompt = usedOriginal ? PREMIUM_FROM_ORIGINAL : PREMIUM_UPGRADE;
  let fullPrompt = premiumPrompt;
  if (storyDirection) {
    fullPrompt += `\n\nSTORY DIRECTION FOR THIS PANEL:\n${storyDirection}`;
  }
  parts.push({ text: '\n' + fullPrompt });

  // ── Composition Reference + Source ──
  const label = usedOriginal
    ? '[COMPOSITION REFERENCE — redraw this ENTIRE scene from scratch as illustration]:'
    : '[SOURCE WEBTOON — enhance to premium quality]:';
  parts.push({ text: '\n' + label });
  parts.push({ inlineData: { mimeType: sourceMimeType, data: sourceBase64 } });

  // Temperature
  let temperature = usedOriginal ? 0.5 : 0.6;
  if (isRetry) temperature = 0.8;

  return { parts, temperature };
}
