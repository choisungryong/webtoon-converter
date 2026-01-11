
import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { env } = getRequestContext<CloudflareEnv>();

        // Check Credentials
        if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME) {
            return NextResponse.json({ error: 'R2 Credentials Missing' }, { status: 500 });
        }

        const S3 = new S3Client({
            region: 'auto',
            endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: env.R2_ACCESS_KEY_ID,
                secretAccessKey: env.R2_SECRET_ACCESS_KEY,
            },
        });

        // Apply CORS Policy
        // Allows Browser (GET, PUT) from any origin
        const command = new PutBucketCorsCommand({
            Bucket: env.R2_BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['PUT', 'GET', 'HEAD', 'POST'],
                        AllowedOrigins: ['*'], // In production, restrictive is better, but '*' is safest to fix immediate user blocker.
                        ExposeHeaders: ['ETag'],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        });

        await S3.send(command);

        return NextResponse.json({
            success: true,
            message: `CORS Policy applied to bucket ${env.R2_BUCKET_NAME}`
        });

    } catch (error) {
        console.error("CORS Setup Failed:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
