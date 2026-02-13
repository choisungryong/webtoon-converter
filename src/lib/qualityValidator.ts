/**
 * Multi-dimensional quality validator for illustration completeness.
 *
 * Three dimensions targeting specific failure modes:
 * 1. illustration_completeness — are ALL elements illustrated?
 * 2. character_consistency — does it match the style anchor? (only when anchor present)
 * 3. environment_completeness — is the ENTIRE background illustrated?
 */

import type { SceneAnalysis, QualityValidation } from '../types';

const VALIDATION_TIMEOUT_MS = 15_000;

interface ValidateOptions {
  apiKey: string;
  imageBase64: string;
  imageMimeType: string;
  sceneAnalysis?: SceneAnalysis | null;
  hasStyleAnchor?: boolean;
}

function buildValidationPrompt(sceneAnalysis?: SceneAnalysis | null): string {
  let specificChecks = '';

  if (sceneAnalysis) {
    // Add specific elements to check from scene analysis
    const peopleChecks = sceneAnalysis.people
      .map(p => `Is the ${p.role} (${p.description}) at ${p.position} drawn as illustration?`)
      .join(' ');

    const surfaceChecks = sceneAnalysis.environment.surfaces
      .map(s => `Is the ${s} illustrated?`)
      .join(' ');

    specificChecks = `
SPECIFIC ELEMENTS TO CHECK:
People: ${peopleChecks}
Surfaces: ${surfaceChecks}`;
  }

  return `Evaluate this image across three dimensions. Be EXTREMELY STRICT — the most common failure is converting ONLY the main character while leaving other people and the background as photographs.
${specificChecks}

Rate each dimension 1-10 where 10 is perfect:

1. illustration_completeness: Count all visible people. Are ALL of them drawn as illustrations with visible outlines and cel-shading? The most common failure is: main character = illustrated, but background people = still photographic with real skin/hair. Score 3 or below if ANY person still has photorealistic skin, real hair texture, or photographic clothing. Score 5 if main character is illustrated but others are mixed.

2. character_consistency: Do ALL people in the image look like they were drawn by the same artist in the same style? Score 3 if one person looks illustrated but another looks photographic.

3. environment_completeness: Is the ENTIRE background illustrated? Check each area:
   - Sky/ceiling: drawn gradients or flat color? Or photographic?
   - Walls/buildings: drawn lines and flat color? Or photographic brick/concrete texture?
   - Ground/floor: illustrated? Or photographic asphalt/tile?
   - Out-of-focus/blurred areas: these are almost ALWAYS still photographs. Blur = camera = photo = FAIL.
   Score 4 or below if ANY background area has photographic texture, camera noise, lens blur, or bokeh — even if it is dark.

Reply with ONLY valid JSON, no explanation:
{"illustration_completeness": N, "character_consistency": N, "environment_completeness": N}`;
}

export async function validateIllustrationQuality(
  options: ValidateOptions,
): Promise<QualityValidation> {
  const { apiKey, imageBase64, imageMimeType, sceneAnalysis, hasStyleAnchor } = options;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: buildValidationPrompt(sceneAnalysis) },
            { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // Fail open — don't block on validation failure
      return { pass: true, dimensions: [], failedDimensions: [] };
    }

    const data = await res.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let scores: Record<string, number>;
    try {
      scores = JSON.parse(text);
    } catch {
      // Try to extract numbers from text
      const nums = text.match(/\d+/g);
      if (nums && nums.length >= 3) {
        scores = {
          illustration_completeness: parseInt(nums[0], 10),
          character_consistency: parseInt(nums[1], 10),
          environment_completeness: parseInt(nums[2], 10),
        };
      } else {
        return { pass: true, dimensions: [], failedDimensions: [] };
      }
    }

    // Define thresholds — strict to catch partial conversions
    const thresholds: Record<string, number> = {
      illustration_completeness: 8,
      character_consistency: hasStyleAnchor ? 7 : 6,
      environment_completeness: 8,
    };

    const dimensions = Object.entries(thresholds).map(([name, threshold]) => {
      const score = scores[name] ?? 10;
      return {
        name,
        score,
        threshold,
        pass: score >= threshold,
      };
    });

    const failedDimensions = dimensions
      .filter(d => !d.pass)
      .map(d => d.name);

    const pass = failedDimensions.length === 0;

    console.log(
      `[Quality Validation] ${pass ? 'PASS' : 'FAIL'} — ` +
      dimensions.map(d => `${d.name}: ${d.score}/${d.threshold}`).join(', ')
    );

    return { pass, dimensions, failedDimensions };
  } catch (e) {
    console.warn('[Quality Validation] Error, skipping:', e);
    return { pass: true, dimensions: [], failedDimensions: [] };
  }
}
