import { getRequestContext } from '@cloudflare/next-on-pages';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Content moderation - Profanity and inappropriate content filter
const BLOCKED_PATTERNS = [
    // Korean profanity
    '시발', '씨발', '씨팔', '시팔', '씹', '좆', '지랄', '병신', '미친놈', '미친년',
    '개새끼', '새끼', '놈', '년', '자지', '보지', '섹스', '야동', '포르노', '성인',
    'ㅅㅂ', 'ㅂㅅ', 'ㅈㄹ', 'ㅆㅂ', 'ㄱㅅㄲ', 'ㅅㅋ',
    // English profanity
    'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cock', 'porn', 'sex',
    // Hate speech
    '죽어', '자살', '살인', '폭행',
    // Spam patterns
    '광고', '홍보', '카톡', '텔레그램', 'http://', 'https://', '.com', '.kr', '.net'
];

const containsBlockedContent = (text: string): { blocked: boolean; reason?: string } => {
    const lowerText = text.toLowerCase().replace(/\s/g, '');

    for (const pattern of BLOCKED_PATTERNS) {
        if (lowerText.includes(pattern.toLowerCase().replace(/\s/g, ''))) {
            return {
                blocked: true,
                reason: '부적절한 표현이 포함되어 있습니다.'
            };
        }
    }

    // Check for repeated characters (spam detection)
    const repeatedPattern = /(.)\1{4,}/;
    if (repeatedPattern.test(text)) {
        return {
            blocked: true,
            reason: '반복된 문자가 포함되어 있습니다.'
        };
    }

    return { blocked: false };
};

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

        // Content moderation check
        const titleCheck = containsBlockedContent(title);
        if (titleCheck.blocked) {
            return NextResponse.json(
                { success: false, error: `제목에 ${titleCheck.reason}` },
                { status: 400 }
            );
        }

        const contentCheck = containsBlockedContent(content);
        if (contentCheck.blocked) {
            return NextResponse.json(
                { success: false, error: `내용에 ${contentCheck.reason}` },
                { status: 400 }
            );
        }

        const nameCheck = containsBlockedContent(author_name || '');
        if (nameCheck.blocked) {
            return NextResponse.json(
                { success: false, error: `이름에 ${nameCheck.reason}` },
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
