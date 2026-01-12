import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { env } = getRequestContext<CloudflareEnv>();
        const userId = request.headers.get('x-user-id');

        if (!env.DB) {
            return NextResponse.json({ error: 'DB binding failed' }, { status: 500 });
        }

        let results;

        if (userId) {
            // Fetch user specific images
            const stmt = await env.DB.prepare(
                `SELECT * FROM generated_images WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
            ).bind(userId);
            results = (await stmt.all()).results;
        } else {
            // Fallback: Fetch legacy images (no user_id) or public images
            // For privacy, maybe we should return empty? 
            // But for transition, let's show images with NULL user_id
            const stmt = await env.DB.prepare(
                `SELECT * FROM generated_images WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50`
            );
            results = (await stmt.all()).results;
        }

        if (!results || results.length === 0) {
            return NextResponse.json({ images: [] });
        }

        // 2. Refresh Signed URLs for all images
        if (!env.R2_ACCOUNT_ID) {
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
