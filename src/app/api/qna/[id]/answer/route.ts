import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// POST: Admin answer to a question
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = getRequestContext();
    const db = env.DB;
    const { id } = await params;

    const body = await request.json();
    const { password, answer } = body;

    // Validate admin password (env var required, no fallback)
    const adminPassword = env.QNA_ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: '관리자 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    if (!answer || !answer.trim()) {
      return NextResponse.json(
        { success: false, error: '답변 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    // Check if post exists
    const existing = await db
      .prepare(
        `
            SELECT id FROM qna_posts WHERE id = ?
        `
      )
      .bind(id)
      .first();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '해당 질문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Update with answer
    const now = Date.now();
    await db
      .prepare(
        `
            UPDATE qna_posts
            SET answer = ?, answered_at = ?
            WHERE id = ?
        `
      )
      .bind(answer.trim(), now, id)
      .run();

    return NextResponse.json({
      success: true,
      message: '답변이 등록되었습니다.',
    });
  } catch (error: any) {
    console.error('Error answering Q&A post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save answer' },
      { status: 500 }
    );
  }
}
