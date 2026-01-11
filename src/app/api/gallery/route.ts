import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { env } = getRequestContext<CloudflareEnv>();

        if (!env.DB) {
            return NextResponse.json({ error: 'DB binding failed' }, { status: 500 });
        }

        // 1. Fetch recent images from D1
        // Using explicit typing for safety, though 'any' is common with raw queries
        const { results } = await env.DB.prepare(
            `SELECT * FROM generated_images ORDER BY created_at DESC LIMIT 50`
        ).all();

        if (!results || results.length === 0) {
            return NextResponse.json({ images: [] });
        }

        // 2. Refresh Signed URLs for all images
        if (!env.R2_ACCOUNT_ID) {
            // If no credentials, we can't sign URLs. Return as is (will break if private bucket)
            return NextResponse.json({ images: results });
        }

        const S3 = new S3Client({
            region: 'auto',
            endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: env.R2_ACCESS_KEY_ID,
                secretAccessKey: env.R2_SECRET_ACCESS_KEY,
            },
        });

        const imagesWithUrls = await Promise.all(results.map(async (img: any) => {
            const getCommand = new GetObjectCommand({
                Bucket: env.R2_BUCKET_NAME,
                Key: img.r2_key,
            });
            const url = await getSignedUrl(S3, getCommand, { expiresIn: 3600 });
            return {
                ...img,
                url
            };
        }));

        return NextResponse.json({ images: imagesWithUrls });

    } catch (error) {
        console.error('Gallery Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }
}
