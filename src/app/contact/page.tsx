'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MailOutlined, QuestionCircleOutlined, CommentOutlined, SendOutlined, EditOutlined, LoadingOutlined } from '@ant-design/icons';
import { Modal, message, Spin } from 'antd';

interface QnaPost {
    id: string;
    author_name: string;
    title: string;
    content: string;
    answer: string | null;
    answered_at: number | null;
    created_at: number;
}

export default function ContactPage() {
    // Q&A State
    const [posts, setPosts] = useState<QnaPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Question Form
    const [authorName, setAuthorName] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    // Admin Answer Modal
    const [answerModalOpen, setAnswerModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<QnaPost | null>(null);
    const [adminPassword, setAdminPassword] = useState('');
    const [answerText, setAnswerText] = useState('');
    const [answering, setAnswering] = useState(false);

    // Fetch Q&A posts
    const fetchPosts = async () => {
        try {
            const res = await fetch('/api/qna');
            const data = await res.json();
            if (data.success) {
                setPosts(data.posts);
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    // Submit new question
    const handleSubmitQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            message.warning('제목과 내용을 입력해주세요.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/qna', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author_name: authorName.trim() || '익명',
                    title: title.trim(),
                    content: content.trim()
                })
            });
            const data = await res.json();
            if (data.success) {
                message.success('질문이 등록되었습니다!');
                setAuthorName('');
                setTitle('');
                setContent('');
                fetchPosts();
            } else {
                message.error(data.error || '등록에 실패했습니다.');
            }
        } catch (error) {
            message.error('네트워크 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    // Open admin answer modal
    const openAnswerModal = (post: QnaPost) => {
        setSelectedPost(post);
        setAnswerText(post.answer || '');
        setAdminPassword('');
        setAnswerModalOpen(true);
    };

    // Submit admin answer
    const handleSubmitAnswer = async () => {
        if (!selectedPost || !answerText.trim() || !adminPassword) {
            message.warning('비밀번호와 답변 내용을 입력해주세요.');
            return;
        }

        setAnswering(true);
        try {
            const res = await fetch(`/api/qna/${selectedPost.id}/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: adminPassword,
                    answer: answerText.trim()
                })
            });
            const data = await res.json();
            if (data.success) {
                message.success('답변이 등록되었습니다!');
                setAnswerModalOpen(false);
                fetchPosts();
            } else {
                message.error(data.error || '답변 등록에 실패했습니다.');
            }
        } catch (error) {
            message.error('네트워크 오류가 발생했습니다.');
        } finally {
            setAnswering(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                        ← 홈
                    </Link>
                    <h1 className="text-2xl font-bold text-white">
                        문의<span className="text-[#CCFF00]">하기</span>
                    </h1>
                </div>

                {/* Hero */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-3">
                        무엇이든 물어보세요!
                    </h2>
                    <p className="text-gray-400 max-w-xl mx-auto">
                        ToonSnap 서비스 이용 중 궁금한 점이나 문제가 있으시면
                        아래 게시판에 질문을 남겨주세요. 빠르게 답변드리겠습니다.
                    </p>
                </div>

                {/* Contact Methods */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#CCFF00]/50 transition-colors">
                        <div className="w-14 h-14 bg-[#CCFF00]/20 rounded-xl flex items-center justify-center mb-4">
                            <MailOutlined className="text-[#CCFF00] text-3xl" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">이메일 문의</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            비공개 문의, 제휴 제안, 버그 신고 등은 이메일로 연락해 주세요.
                        </p>
                        <a
                            href="mailto:twinspa0713@gmail.com"
                            className="inline-flex items-center gap-2 text-[#CCFF00] hover:underline font-medium"
                        >
                            twinspa0713@gmail.com
                        </a>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#CCFF00]/50 transition-colors">
                        <div className="w-14 h-14 bg-[#CCFF00]/20 rounded-xl flex items-center justify-center mb-4">
                            <CommentOutlined className="text-[#CCFF00] text-3xl" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Q&A 게시판</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            자주 묻는 질문이나 일반적인 문의는 아래 게시판을 이용해 주세요.
                        </p>
                        <span className="text-[#CCFF00] font-medium">
                            {posts.length}개의 질문 등록됨
                        </span>
                    </div>
                </div>

                {/* Q&A Board - Question Form */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-8">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <SendOutlined className="text-[#CCFF00]" />
                        질문 작성하기
                    </h3>
                    <form onSubmit={handleSubmitQuestion} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder="이름 (선택, 비워두면 익명)"
                                value={authorName}
                                onChange={(e) => setAuthorName(e.target.value)}
                                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#CCFF00] focus:outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="제목 *"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#CCFF00] focus:outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <textarea
                                placeholder="질문 내용을 입력해주세요 *"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                                rows={4}
                                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#CCFF00] focus:outline-none transition-colors resize-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-[#CCFF00] text-black font-bold py-3 rounded-lg hover:bg-[#bbe600] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? <LoadingOutlined /> : <SendOutlined />}
                            {submitting ? '등록 중...' : '질문 등록하기'}
                        </button>
                    </form>
                </div>

                {/* Q&A Board - Posts List */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <QuestionCircleOutlined className="text-[#CCFF00] text-2xl" />
                        <h3 className="text-xl font-bold text-white">Q&A 게시판</h3>
                        <span className="text-gray-500 text-sm ml-auto">{posts.length}개의 질문</span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Spin size="large" />
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            아직 등록된 질문이 없습니다.<br />
                            첫 번째 질문을 남겨보세요!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {posts.map((post) => (
                                <div
                                    key={post.id}
                                    className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-white/20 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex-1">
                                            <h4 className="text-white font-semibold mb-1">{post.title}</h4>
                                            <p className="text-gray-500 text-xs">
                                                {post.author_name} · {formatDate(post.created_at)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => openAnswerModal(post)}
                                            className="text-gray-400 hover:text-[#CCFF00] transition-colors p-2"
                                            title="답변 작성 (관리자)"
                                        >
                                            <EditOutlined />
                                        </button>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-4 whitespace-pre-wrap">{post.content}</p>

                                    {post.answer ? (
                                        <div className="bg-[#CCFF00]/10 border border-[#CCFF00]/30 rounded-lg p-4 mt-3">
                                            <p className="text-[#CCFF00] text-xs font-semibold mb-2">
                                                ✅ 관리자 답변 · {post.answered_at ? formatDate(post.answered_at) : ''}
                                            </p>
                                            <p className="text-gray-300 text-sm whitespace-pre-wrap">{post.answer}</p>
                                        </div>
                                    ) : (
                                        <div className="text-gray-600 text-sm italic">
                                            답변 대기 중...
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FAQ Section */}
                <details className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-8 group">
                    <summary className="flex items-center gap-3 cursor-pointer list-none">
                        <QuestionCircleOutlined className="text-[#CCFF00] text-2xl" />
                        <h3 className="text-xl font-bold text-white">자주 묻는 질문 (FAQ)</h3>
                        <span className="text-gray-500 ml-auto group-open:rotate-180 transition-transform">▼</span>
                    </summary>

                    <div className="space-y-3 mt-6">
                        {[
                            { q: '서비스 이용료가 있나요?', a: 'ToonSnap의 기본 기능은 완전 무료로 제공됩니다.' },
                            { q: '변환된 이미지의 저작권은 누구에게 있나요?', a: '변환 결과물은 개인적, 비상업적 용도로 자유롭게 사용할 수 있습니다.' },
                            { q: '업로드한 사진은 어떻게 처리되나요?', a: '업로드된 사진은 오직 변환 목적으로만 사용되며, AI 모델 학습에 사용되지 않습니다.' },
                            { q: '한 번에 몇 장까지 변환할 수 있나요?', a: '현재 한 번에 최대 5장까지 동시에 변환할 수 있습니다.' },
                            { q: '변환 시간은 얼마나 걸리나요?', a: '평균적으로 이미지 1장당 약 10~30초 정도 소요됩니다.' },
                            { q: '모바일에서도 사용할 수 있나요?', a: '네! ToonSnap은 모바일 최적화되어 있어 스마트폰에서도 사용할 수 있습니다.' },
                        ].map((item, idx) => (
                            <details key={idx} className="group/item bg-white/5 rounded-lg">
                                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                    <span className="text-white font-medium">Q. {item.q}</span>
                                    <span className="text-gray-500 group-open/item:rotate-180 transition-transform">▼</span>
                                </summary>
                                <div className="px-4 pb-4 text-gray-400 text-sm">A. {item.a}</div>
                            </details>
                        ))}
                    </div>
                </details>

                {/* Business Inquiry */}
                <div className="bg-gradient-to-br from-[#CCFF00]/10 to-transparent border border-[#CCFF00]/30 rounded-2xl p-6 md:p-8">
                    <h3 className="text-xl font-bold text-white mb-3">비즈니스 및 제휴 문의</h3>
                    <p className="text-gray-400 mb-4">
                        기업 제휴, 광고, 미디어 관련 문의는 별도의 채널로 연락해 주세요.
                    </p>
                    <a
                        href="mailto:twinspa0713@gmail.com"
                        className="inline-flex items-center gap-2 bg-[#CCFF00] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#bbe600] transition-colors"
                    >
                        <MailOutlined />
                        twinspa0713@gmail.com
                    </a>
                </div>
            </div>

            {/* Admin Answer Modal */}
            <Modal
                title={<span className="text-white">관리자 답변 작성</span>}
                open={answerModalOpen}
                onCancel={() => setAnswerModalOpen(false)}
                footer={null}
                className="dark-modal"
                styles={{
                    content: { backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' },
                    header: { backgroundColor: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.1)' },
                }}
            >
                {selectedPost && (
                    <div className="space-y-4">
                        <div className="bg-white/5 rounded-lg p-4">
                            <h4 className="text-white font-semibold mb-2">{selectedPost.title}</h4>
                            <p className="text-gray-400 text-sm">{selectedPost.content}</p>
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm block mb-2">관리자 비밀번호</label>
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                placeholder="비밀번호 입력"
                                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#CCFF00] focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm block mb-2">답변 내용</label>
                            <textarea
                                value={answerText}
                                onChange={(e) => setAnswerText(e.target.value)}
                                placeholder="답변을 입력해주세요"
                                rows={5}
                                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#CCFF00] focus:outline-none resize-none"
                            />
                        </div>
                        <button
                            onClick={handleSubmitAnswer}
                            disabled={answering}
                            className="w-full bg-[#CCFF00] text-black font-bold py-3 rounded-lg hover:bg-[#bbe600] transition-colors disabled:opacity-50"
                        >
                            {answering ? '등록 중...' : '답변 등록하기'}
                        </button>
                    </div>
                )}
            </Modal>
        </main>
    );
}
