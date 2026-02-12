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

  return `Evaluate this image across three dimensions. Be STRICT — if even one element looks photographic, that dimension should score low.
${specificChecks}

Rate each dimension 1-10 where 10 is perfect:

1. illustration_completeness: Are ALL people (foreground AND background bystanders) drawn as illustrations with visible outlines and cel-shading? Score 5 or below if ANY person looks photorealistic.

2. character_consistency: Is the art style consistent across all characters? Do they look like they were drawn by the same artist? (If only one character, score based on style quality.)

3. environment_completeness: Is the ENTIRE background illustrated? Check sky/ceiling, ground/floor, walls, buildings, furniture, streets. Score 5 or below if ANY surface looks photographic.

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
            { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
            { text: buildValidationPrompt(sceneAnalysis) },
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

    // Define thresholds
    const thresholds: Record<string, number> = {
      illustration_completeness: 7,
      character_consistency: hasStyleAnchor ? 6 : 5, // Relaxed when no anchor
      environment_completeness: 7,
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
