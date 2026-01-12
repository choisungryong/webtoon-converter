import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { S3Client, ListMultipartUploadsCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { env } = getRequestContext<CloudflareEnv>();

        if (!env.DB || !env.R2) {
            return NextResponse.json({ error: 'DB or R2 binding failed' }, { status: 500 });
        }

        // Initialize S3 Client for advanced operations
        let deletedMultipart = 0;
        let multipartDetails = [];

        if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
            const S3 = new S3Client({
                region: 'auto',
                endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: env.R2_ACCESS_KEY_ID,
                    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
                },
            });

            // 0. Clean up Incomplete Multipart Uploads (Hidden space consumers)
            try {
                const listCommand = new ListMultipartUploadsCommand({
                    Bucket: env.R2_BUCKET_NAME,
                });
                const { Uploads } = await S3.send(listCommand);

                if (Uploads && Uploads.length > 0) {
                    for (const upload of Uploads) {
                        if (upload.Key && upload.UploadId) {
                            const abortCommand = new AbortMultipartUploadCommand({
                                Bucket: env.R2_BUCKET_NAME,
                                Key: upload.Key,
                                UploadId: upload.UploadId,
                            });
                            await S3.send(abortCommand);
                            deletedMultipart++;
                            multipartDetails.push(upload.Key);
                        }
                    }
                }
            } catch (s3Error) {
                console.error('S3 Cleanup Error:', s3Error);
            }
        }

        // 1. Find Legacy Images (user_id IS NULL)
        const { results } = await env.DB.prepare(
            `SELECT * FROM generated_images WHERE user_id IS NULL`
        ).all();

        const legacyImages = results as { id: string, r2_key: string }[];
        const count = legacyImages.length;

        // 2. Delete from R2
        let deletedR2 = 0;
        if (count > 0) {
            const deletePromises = legacyImages.map(async (img) => {
                try {
                    await env.R2.delete(img.r2_key);
                    deletedR2++;
                } catch (e) {
                    console.error(`Failed to delete R2 object: ${img.r2_key}`, e);
                }
            });
            await Promise.all(deletePromises);

            // 3. Delete from D1
            await env.DB.prepare(
                `DELETE FROM generated_images WHERE user_id IS NULL`
            ).run();
        }

        return NextResponse.json({
            success: true,
            message: `Cleanup Complete.`,
            details: {
                deletedLegacyImages: deletedR2,
                deletedHiddenMultipartUploads: deletedMultipart,
                hiddenFilesFound: multipartDetails
            }
        });

    } catch (error) {
        console.error('Cleanup Error:', error);
        return NextResponse.json({ error: `Cleanup failed: ${(error as Error).message}` }, { status: 500 });
    }
}
