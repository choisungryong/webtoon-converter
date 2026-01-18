import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface QnaPost {
    id: string;
    author_name: string;
    title: string;
    content: string;
    answer: string | null;
    answered_at: number | null;
    created_at: number;
}

// GET: List all Q&A posts
export async function GET() {
    try {
        const { env } = getRequestContext();
        const db = env.DB;

        const result = await db.prepare(`
            SELECT id, author_name, title, content, answer, answered_at, created_at
            FROM qna_posts
            ORDER BY created_at DESC
            LIMIT 100
        `).all<QnaPost>();

        return NextResponse.json({
            success: true,
            posts: result.results || []
        });
    } catch (error: any) {
        console.error('Error fetching Q&A posts:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch posts' },
            { status: 500 }
        );
    }
}

// POST: Create new question
export async function POST(request: NextRequest) {
    try {
        const { env } = getRequestContext();
        const db = env.DB;

        const body = await request.json();
        const { author_name, title, content } = body;

        if (!title || !content) {
            return NextResponse.json(
                { success: false, error: '제목과 내용을 입력해주세요.' },
                { status: 400 }
            );
        }

        const id = crypto.randomUUID();
        const authorName = author_name?.trim() || '익명';

        await db.prepare(`
            INSERT INTO qna_posts (id, author_name, title, content)
            VALUES (?, ?, ?, ?)
        `).bind(id, authorName, title.trim(), content.trim()).run();

        return NextResponse.json({
            success: true,
            id,
            message: '질문이 등록되었습니다.'
        });
    } catch (error: any) {
        console.error('Error creating Q&A post:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create post' },
            { status: 500 }
        );
    }
}
