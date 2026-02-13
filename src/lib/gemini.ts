/**
 * Shared Gemini API call function.
 * Extracted from /api/ai/start/route.ts for reuse in job processor.
 */

import type { GeminiPart } from '../types';

const GEMINI_TIMEOUT_MS = 60_000; // 60 seconds

/**
 * Call Gemini API and extract generated image from response.
 * Throws on errors so callers can capture the message.
 */
export async function callGemini(
  apiKey: string,
  parts: GeminiPart[],
  temperature: number,
): Promise<{ imageBase64: string; mimeType: string } | null> {
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

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
    const name = (fetchError as Error).name;
    if (name === 'AbortError') {
      throw new Error(`Gemini API timeout (${GEMINI_TIMEOUT_MS / 1000}s)`);
    }
    throw new Error(`Gemini fetch failed: ${(fetchError as Error).message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!geminiRes.ok) {
    const errorText = await geminiRes.text();
    console.error('Gemini API Error:', geminiRes.status, errorText);
    throw new Error(`Gemini ${geminiRes.status}: ${errorText.substring(0, 200)}`);
  }

  const geminiData = await geminiRes.json() as any;
  const candidates = geminiData.candidates;

  if (!candidates || candidates.length === 0) {
    // Check for safety block
    const blockReason = geminiData.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(`Gemini blocked: ${blockReason}`);
    }
    throw new Error('Gemini returned no candidates');
  }

  // Check for finish reason
  const finishReason = candidates[0]?.finishReason;
  if (finishReason === 'SAFETY') {
    throw new Error('Gemini blocked by safety filter');
  }

  const responseParts = candidates[0]?.content?.parts || [];
  for (const part of responseParts) {
    if (part.inlineData) {
      return {
        imageBase64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
      };
    }
  }

  // Response had text but no image
  const textParts = responseParts.filter((p: any) => p.text).map((p: any) => p.text).join(' ');
  throw new Error(`Gemini returned text only: ${textParts.substring(0, 150)}`);
}
