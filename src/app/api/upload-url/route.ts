import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const { filename, fileType } = await request.json();

        if (!filename || !fileType) {
            return NextResponse.json({ error: '파일명과 타입이 필요합니다.' }, { status: 400 });
        }

        const { env } = getRequestContext<CloudflareEnv>();

        // D1 Database check
        if (!env.DB) {
            return NextResponse.json({ error: 'DB 설정이 누락되었습니다 (D1).' }, { status: 500 });
        }

        // R2 Client Setup (using AWS SDK for signing)
        // Note: These env vars must be set in Cloudflare Dashboard
        const R2_ACCOUNT_ID = env.R2_ACCOUNT_ID;
        const R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID;
        const R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY;
        const R2_BUCKET_NAME = env.R2_BUCKET_NAME;

        const missingVars = [];
        if (!R2_ACCOUNT_ID) missingVars.push('R2_ACCOUNT_ID');
        if (!R2_ACCESS_KEY_ID) missingVars.push('R2_ACCESS_KEY_ID');
        if (!R2_SECRET_ACCESS_KEY) missingVars.push('R2_SECRET_ACCESS_KEY');
        if (!R2_BUCKET_NAME) missingVars.push('R2_BUCKET_NAME');

        if (missingVars.length > 0) {
            return NextResponse.json({
                error: `R2 환경 변수 누락: ${missingVars.join(', ')}. Cloudflare Pages 설정 > Environment variables 메뉴를 확인하세요.`
            }, { status: 500 });
        }

        const S3 = new S3Client({
            region: 'auto',
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        });

        const fileId = uuidv4();
        const r2Key = `${Date.now()}-${filename}`;

        // 1. Generate Presigned URL
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Key,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });

        // 2. Insert into D1
        await env.DB.prepare(
            `INSERT INTO videos (id, filename, status, r2_key) VALUES (?, ?, ?, ?)`
        ).bind(fileId, filename, 'pending', r2Key).run();

        return NextResponse.json({
            success: true,
            uploadUrl,
            fileId,
            r2Key
        });

    } catch (error) {
        console.error('Presigned URL Error:', error);
        return NextResponse.json({
            error: `URL 생성 실패: ${(error as Error).message}`
        }, { status: 500 });
    }
}
