import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  const { env } = getRequestContext();

  if (!env.DB) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const job = await env.DB.prepare(
      'SELECT status, result_url, error FROM conversion_jobs WHERE id = ?'
    )
      .bind(jobId)
      .first();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
