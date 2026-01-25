import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { env } = getRequestContext();

        // Safely check bindings without exposing secrets
        const status = {
            timestamp: new Date().toISOString(),
            env: {
                hasDB: !!env?.DB,
                hasR2: !!(env as any)?.R2, // Cast to any if type definition is strict
                hasApiKey: !!env?.GEMINI_API_KEY,
                apiKeyPrefix: env?.GEMINI_API_KEY ? `${env.GEMINI_API_KEY.substring(0, 3)}...` : 'MISSING'
            }
        };

        // Try a simple DB query if DB exists
        let dbStatus = 'SKIPPED';
        if (env?.DB) {
            try {
                await env.DB.prepare('SELECT 1').first();
                dbStatus = 'OK';
            } catch (e) {
                dbStatus = `ERROR: ${(e as Error).message}`;
            }
        }

        return NextResponse.json({ ...status, dbConnection: dbStatus });
    } catch (error) {
        return NextResponse.json({
            error: 'CRITICAL_FAILURE',
            message: (error as Error).message,
            stack: (error as Error).stack
        }, { status: 500 });
    }
}
