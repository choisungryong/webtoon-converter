import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { env } = getRequestContext();

        // Require admin password for debug endpoint
        const url = new URL(request.url);
        const password = url.searchParams.get('key');
        const adminPassword = env.QNA_ADMIN_PASSWORD;
        if (!adminPassword || password !== adminPassword) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const status = {
            timestamp: new Date().toISOString(),
            env: {
                hasDB: !!env?.DB,
                hasR2: !!(env as any)?.R2,
                hasApiKey: !!env?.GEMINI_API_KEY,
            }
        };

        // Read-only DB health check (no test writes)
        let dbStatus = 'SKIPPED';
        if (env?.DB) {
            try {
                await env.DB.prepare('SELECT 1').first();
                dbStatus = 'OK';
            } catch (e) {
                dbStatus = 'Connection Failed';
            }
        }

        return NextResponse.json({ ...status, dbConnection: dbStatus });
    } catch {
        return NextResponse.json(
            { error: 'Internal error' },
            { status: 500 }
        );
    }
}
