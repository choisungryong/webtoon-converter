import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { generateUUID } from '../../../../utils/commonUtils';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { env } = getRequestContext();
        const uuid = generateUUID(); // Test function call

        // Safely check bindings without exposing secrets
        const status = {
            timestamp: new Date().toISOString(),
            uuidTest: uuid,
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
                dbStatus = 'Read OK';

                // Test Write
                try {
                    await env.DB.prepare("INSERT INTO usage_logs (id, user_id, action) VALUES (?, ?, 'debug_test')")
                        .bind(crypto.randomUUID(), 'debug_user')
                        .run();
                    dbStatus = 'Read/Write OK';
                } catch (writeErr) {
                    dbStatus = `Read OK, Write Failed: ${(writeErr as Error).message}`;
                }
            } catch (e) {
                dbStatus = `Connection Failed: ${(e as Error).message}`;
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
