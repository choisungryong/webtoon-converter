import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { refundCredits, CREDIT_COSTS } from '../../../../../lib/credits';

export const runtime = 'edge';

const STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const PENDING_TIMEOUT_MS = 60 * 1000; // 1 minute - if still pending, ctx.waitUntil likely failed

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: 'Missing job ID' }, { status: 400 });
    }

    const { env } = getRequestContext();
    if (!env.DB) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const job = await env.DB.prepare(
      `SELECT * FROM conversion_jobs WHERE id = ?`
    ).bind(jobId).first() as any;

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Staleness detection: if stuck in 'pending' (ctx.waitUntil never started processing)
    if (
      job.status === 'pending' &&
      job.created_at &&
      Date.now() - job.created_at > PENDING_TIMEOUT_MS
    ) {
      await env.DB.prepare(
        `UPDATE conversion_jobs SET status = 'failed', error_message = 'Job failed to start', completed_at = ? WHERE id = ?`
      ).bind(Date.now(), jobId).run();

      // Refund all credits
      const totalCount = job.total_images || 0;
      if (totalCount > 0) {
        try {
          const { getUserFromRequest } = await import('../../../../../lib/auth');
          const authUser = await getUserFromRequest(request, env);
          if (authUser?.id) {
            await refundCredits(env.DB, authUser.id, totalCount * CREDIT_COSTS.basic_convert, 'job_pending_refund', jobId);
          }
        } catch { /* best effort */ }
      }

      return NextResponse.json({
        status: 'failed',
        completedImages: 0,
        totalImages: totalCount,
        resultIds: [],
        failedIndices: [],
        errorMessage: 'Job failed to start',
      });
    }

    // Staleness detection: if processing for too long, mark as failed
    if (
      job.status === 'processing' &&
      job.started_at &&
      Date.now() - job.started_at > STALE_TIMEOUT_MS
    ) {
      await env.DB.prepare(
        `UPDATE conversion_jobs SET status = 'failed', error_message = 'Processing timed out', completed_at = ? WHERE id = ?`
      ).bind(Date.now(), jobId).run();

      // Refund credits for unfinished images
      const completedCount = job.completed_images || 0;
      const totalCount = job.total_images || 0;
      const failedCount = totalCount - completedCount;
      if (failedCount > 0) {
        try {
          // Try to find auth user for refund
          const { getUserFromRequest } = await import('../../../../../lib/auth');
          const authUser = await getUserFromRequest(request, env);
          if (authUser?.id) {
            await refundCredits(
              env.DB,
              authUser.id,
              failedCount * CREDIT_COSTS.basic_convert,
              'job_stale_refund',
              jobId,
            );
          }
        } catch { /* best effort */ }
      }

      return NextResponse.json({
        status: 'failed',
        completedImages: job.completed_images || 0,
        totalImages: job.total_images || 0,
        resultIds: safeParseJSON(job.result_ids, []),
        failedIndices: safeParseJSON(job.failed_indices, []),
        errorMessage: 'Processing timed out',
      });
    }

    return NextResponse.json({
      status: job.status,
      completedImages: job.completed_images || 0,
      totalImages: job.total_images || 0,
      resultIds: safeParseJSON(job.result_ids, []),
      failedIndices: safeParseJSON(job.failed_indices, []),
      errorMessage: job.error_message || undefined,
    });
  } catch (error) {
    console.error('[API/Job/Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}

function safeParseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
