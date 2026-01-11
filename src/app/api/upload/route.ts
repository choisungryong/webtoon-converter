import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

// Cloudflare Pages(Workers) 환경에서 실행되도록 설정
export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        // 1. 요청에서 파일 데이터 추출
        const formData = await request.formData();
        const file = formData.get('video') as File;

        if (!file) {
            return NextResponse.json({ error: '업로드할 파일이 없습니다.' }, { status: 400 });
        }

        // 2. 유니크한 파일명 생성 (타임스탬프 활용)
        const fileName = `${Date.now()}-${file.name}`;

        // 3. Cloudflare R2 버킷 인터페이스 가져오기 (표준 방식)
        const { env } = getRequestContext<CloudflareEnv>();
        const bucket = env.R2;

        if (!bucket) {
            return NextResponse.json(
                { error: 'R2 버킷 바인딩 설정을 찾을 수 없습니다. Cloudflare 대시보드에서 R2 변수를 연결해 주세요.' },
                { status: 500 }
            );
        }

        // 4. R2 버킷에 파일 저장
        await bucket.put(fileName, file.stream(), {
            httpMetadata: { contentType: file.type },
        });

        return NextResponse.json({
            success: true,
            fileName,
            message: 'R2 저장소 업로드 완료'
        });
    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: '서버 내부 오류 발생' }, { status: 500 });
    }
}