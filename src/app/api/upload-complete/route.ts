import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const { fileId } = await request.json();

        if (!fileId) {
            return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
        }

        const { env } = getRequestContext<CloudflareEnv>();

        if (!env.DB) {
            return NextResponse.json({ error: 'DB configuration missing' }, { status: 500 });
        }

        // Update status to 'uploaded'
        const result = await env.DB.prepare(
            `UPDATE videos SET status = 'uploaded', updated_at = strftime('%s', 'now') WHERE id = ?`
        ).bind(fileId).run();

        if (result.success) {
            return NextResponse.json({ success: true, message: 'Status updated to uploaded' });
        } else {
            throw new Error('Database update failed');
        }

    } catch (error) {
        console.error('Completion Error:', error);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }
}
