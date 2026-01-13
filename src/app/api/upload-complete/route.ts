import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function POST(request: NextRequest) {
    try {
        const { env } = await getCloudflareContext();
        const { fileId } = await request.json();

        if (!fileId) {
            return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
        }

        if (env.DB) {
            await env.DB.prepare(
                `UPDATE videos SET status = ? WHERE id = ?`
            ).bind('completed', fileId).run();
        }

        return NextResponse.json({ success: true, fileId });

    } catch (error) {
        console.error('Upload Complete Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
