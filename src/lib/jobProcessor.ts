/**
 * Background conversion job processor.
 * Runs inside ctx.waitUntil() after HTTP response is sent.
 */

import { generateUUID } from '../utils/commonUtils';
import { callGemini } from './gemini';
import { buildBasicPromptParts } from './promptBuilder';
import { validateIllustrationQuality } from './qualityValidator';
import { refundCredits, CREDIT_COSTS } from './credits';
import { loadInputImage, cleanupInputImages } from './r2Utils';
import type { SceneAnalysis } from '../types';

const MAX_RETRIES = 2;
const DELAY_BETWEEN_IMAGES_MS = 2000;

/**
 * Process a conversion job in the background.
 * Updates DB progress after each image so the client can poll.
 */
export async function processConversionJob(
  env: { DB: any; R2: any; GEMINI_API_KEY: string },
  jobId: string,
  inputR2Keys: string[],
  styleId: string,
  userId: string,
  sceneAnalysis: SceneAnalysis | null,
  authUserId: string | null,
): Promise<void> {
  const apiKey = env.GEMINI_API_KEY;
  const db = env.DB;
  const r2 = env.R2;

  try {
    // Mark as processing
    await db.prepare(
      `UPDATE conversion_jobs SET status = 'processing', started_at = ? WHERE id = ?`
    ).bind(Date.now(), jobId).run();

    const resultIds: string[] = [];
    const failedIndices: number[] = [];
    let styleReference: { data: string; mimeType: string } | null = null;
    let firstErrorMessage = '';

    for (let i = 0; i < inputR2Keys.length; i++) {
      // Add delay between images to avoid rate limiting
      if (i > 0) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_IMAGES_MS));
      }

      try {
        // Load input image from R2
        const { base64: sourceBase64, mimeType: sourceMimeType } = await loadInputImage(r2, inputR2Keys[i]);

        // Convert single image with retry + quality gate
        const result = await convertSingleImage(apiKey, sourceBase64, sourceMimeType, {
          styleId,
          styleRef: styleReference,
          sceneAnalysis,
        });

        if (!result || !result.imageBase64) {
          if (result?.error && !firstErrorMessage) firstErrorMessage = result.error;
          failedIndices.push(i);
          await updateJobProgress(db, jobId, i + 1, resultIds, failedIndices);
          continue;
        }

        // Save result to R2
        const imageId = generateUUID();
        const r2Key = `generated/${imageId}.png`;
        const binary = Uint8Array.from(atob(result.imageBase64), c => c.charCodeAt(0));
        await r2.put(r2Key, binary, { httpMetadata: { contentType: result.mimeType } });

        // Save to generated_images DB
        await db.prepare(
          `INSERT INTO generated_images (id, r2_key, type, user_id, created_at) VALUES (?, ?, 'generated', ?, ?)`
        ).bind(imageId, r2Key, userId, Date.now()).run();

        resultIds.push(imageId);

        // Use first successful result as style anchor
        if (!styleReference) {
          styleReference = { data: result.imageBase64, mimeType: result.mimeType };
          // Store style reference R2 key on the job
          await db.prepare(
            `UPDATE conversion_jobs SET style_reference = ? WHERE id = ?`
          ).bind(r2Key, jobId).run();
        }

        // Update progress
        await updateJobProgress(db, jobId, i + 1, resultIds, failedIndices);
      } catch (imgError) {
        console.error(`[JobProcessor] Image ${i} failed:`, imgError);
        failedIndices.push(i);
        await updateJobProgress(db, jobId, i + 1, resultIds, failedIndices);
      }
    }

    // Determine final status
    let finalStatus: 'completed' | 'failed' | 'partial';
    if (resultIds.length === 0) {
      finalStatus = 'failed';
    } else if (failedIndices.length > 0) {
      finalStatus = 'partial';
    } else {
      finalStatus = 'completed';
    }

    await db.prepare(
      `UPDATE conversion_jobs SET status = ?, completed_at = ?, result_ids = ?, failed_indices = ?, error_message = ? WHERE id = ?`
    ).bind(finalStatus, Date.now(), JSON.stringify(resultIds), JSON.stringify(failedIndices), firstErrorMessage || null, jobId).run();

    // Refund credits for failed images
    if (failedIndices.length > 0 && authUserId) {
      const refundAmount = failedIndices.length * CREDIT_COSTS.basic_convert;
      try {
        await refundCredits(db, authUserId, refundAmount, 'job_partial_refund', jobId);
      } catch { /* best effort */ }
    }

    // If all failed, refund everything
    if (finalStatus === 'failed' && authUserId) {
      const totalRefund = inputR2Keys.length * CREDIT_COSTS.basic_convert;
      try {
        await refundCredits(db, authUserId, totalRefund, 'job_full_refund', jobId);
      } catch { /* best effort */ }
    }

    // Cleanup temporary input images
    try {
      await cleanupInputImages(r2, jobId, inputR2Keys.length);
    } catch { /* best effort */ }

  } catch (error) {
    console.error(`[JobProcessor] Fatal error for job ${jobId}:`, error);
    try {
      await db.prepare(
        `UPDATE conversion_jobs SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?`
      ).bind('Internal processing error', Date.now(), jobId).run();

      // Refund all credits on fatal error
      if (authUserId) {
        const totalRefund = inputR2Keys.length * CREDIT_COSTS.basic_convert;
        await refundCredits(db, authUserId, totalRefund, 'job_error_refund', jobId);
      }
    } catch { /* best effort */ }
  }
}

/** Update job progress in DB */
async function updateJobProgress(
  db: any,
  jobId: string,
  completedImages: number,
  resultIds: string[],
  failedIndices: number[],
): Promise<void> {
  await db.prepare(
    `UPDATE conversion_jobs SET completed_images = ?, result_ids = ?, failed_indices = ? WHERE id = ?`
  ).bind(completedImages, JSON.stringify(resultIds), JSON.stringify(failedIndices), jobId).run();
}

/** Convert a single image with retry + quality validation */
async function convertSingleImage(
  apiKey: string,
  sourceBase64: string,
  sourceMimeType: string,
  options: {
    styleId: string;
    styleRef: { data: string; mimeType: string } | null;
    sceneAnalysis: SceneAnalysis | null;
  },
): Promise<{ imageBase64: string; mimeType: string; error?: string } | null> {
  let result: { imageBase64: string; mimeType: string } | null = null;
  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[JobProcessor] Retry attempt ${attempt}/${MAX_RETRIES}`);
    }

    try {
      const { parts, temperature } = buildBasicPromptParts(sourceBase64, sourceMimeType, {
        styleId: options.styleId,
        styleRef: options.styleRef,
        sceneAnalysis: options.sceneAnalysis,
        retryLevel: attempt,
      });

      result = await callGemini(apiKey, parts, temperature);
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Unknown Gemini error';
      console.error(`[JobProcessor] Gemini call error (attempt ${attempt}):`, lastError);
      result = null;
    }

    if (!result?.imageBase64) {
      if (!lastError) lastError = 'No image in Gemini response';
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    lastError = '';

    // Quality gate (skip on final attempt)
    if (attempt < MAX_RETRIES) {
      const quality = await validateIllustrationQuality({
        apiKey,
        imageBase64: result.imageBase64,
        imageMimeType: result.mimeType,
        sceneAnalysis: options.sceneAnalysis,
        hasStyleAnchor: !!options.styleRef,
      });
      if (quality.pass) break;
      console.log(`[JobProcessor] Quality failed: ${quality.failedDimensions.join(', ')}`);
      result = null;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!result && lastError) {
    return { imageBase64: '', mimeType: '', error: lastError };
  }
  return result;
}
