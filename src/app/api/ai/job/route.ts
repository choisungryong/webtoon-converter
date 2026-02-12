import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getUserFromRequest } from '../../../../lib/auth';
import { checkAndDeductCredits, CREDIT_COSTS } from '../../../../lib/credits';
import { storeInputImage } from '../../../../lib/r2Utils';
import { processConversionJob } from '../../../../lib/jobProcessor';
import { generateUUID } from '../../../../utils/commonUtils';
import type { SceneAnalysis } from '../../../../types';

export const runtime = 'edge';

const MAX_IMAGES = 10;
const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // ~7.5MB per image

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      images: string[];
      styleId: string;
      userId: string;
      type: 'photo' | 'video';
      sceneAnalysis?: SceneAnalysis;
    };

    const { images, styleId, userId, type, sceneAnalysis } = body;

    // Validate input
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }
    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images allowed` }, { status: 400 });
    }
    if (!styleId || !userId) {
      return NextResponse.json({ error: 'Missing styleId or userId' }, { status: 400 });
    }

    // Validate each image
    for (let i = 0; i < images.length; i++) {
      if (typeof images[i] !== 'string') {
        return NextResponse.json({ error: `Image ${i} is not a string` }, { status: 400 });
      }
      if (!images[i].match(/^data:image\/\w+;base64,.+$/)) {
        return NextResponse.json({ error: `Image ${i} is not a valid base64 data URI` }, { status: 400 });
      }
      const base64Part = images[i].split(',')[1];
      if (base64Part && base64Part.length > MAX_BASE64_LENGTH) {
        return NextResponse.json({ error: `Image ${i} is too large` }, { status: 413 });
      }
    }

    const { env, ctx } = getRequestContext();
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    if (!env.DB || !env.R2) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Auth + credit check
    let authUser: any = null;
    try { authUser = await getUserFromRequest(request, env); } catch { /* optional */ }

    const totalCost = images.length * CREDIT_COSTS.basic_convert;
    const creditResult = await checkAndDeductCredits(env.DB, {
      userId: authUser?.id || null,
      legacyUserId: userId,
      isAuthenticated: !!authUser,
      cost: totalCost,
      reason: 'batch_convert',
    });

    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error || 'INSUFFICIENT_CREDITS' },
        { status: 402 }
      );
    }

    // Store input images to R2 (avoids sending large payloads to D1)
    const jobId = generateUUID();
    const inputR2Keys: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const key = await storeInputImage(env.R2, images[i], jobId, i);
      inputR2Keys.push(key);
    }

    // Create job record
    await env.DB.prepare(
      `INSERT INTO conversion_jobs (id, user_id, type, status, style_id, total_images, scene_analysis, created_at)
       VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)`
    ).bind(
      jobId,
      userId,
      type || 'photo',
      styleId,
      images.length,
      sceneAnalysis ? JSON.stringify(sceneAnalysis) : null,
      Date.now(),
    ).run();

    // Start background processing
    ctx.waitUntil(
      processConversionJob(
        env,
        jobId,
        inputR2Keys,
        styleId,
        userId,
        sceneAnalysis || null,
        authUser?.id || null,
      )
    );

    // Return immediately with job ID
    return NextResponse.json(
      { jobId, totalImages: images.length },
      { status: 202 }
    );
  } catch (error) {
    console.error('[API/Job] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create conversion job' },
      { status: 500 }
    );
  }
}
