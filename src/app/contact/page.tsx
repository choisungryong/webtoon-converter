'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MailOutlined,
  QuestionCircleOutlined,
  CommentOutlined,
  SendOutlined,
  EditOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { Modal, message, Spin } from 'antd';
import { formatToKoreanDate } from '../../utils/dateUtils';

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
          content: content.trim(),
        }),
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
          answer: answerText.trim(),
        }),
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

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/" className="text-gray-400 transition-colors hover:text-white">
            ← 홈
          </Link>
          <h1 className="text-2xl font-bold text-white">
            문의<span className="text-neonYellow">하기</span>
          </h1>
        </div>

        {/* Hero */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h2 className="mb-3 text-2xl font-bold text-white">무엇이든 물어보세요!</h2>
          <p className="mx-auto max-w-xl text-gray-400">
            BanaToon 서비스 이용 중 궁금한 점이나 문제가 있으시면 아래 게시판에 질문을 남겨주세요.
            빠르게 답변드리겠습니다.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-[#CCFF00]/50">
            <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-[#CCFF00]/20">
              <MailOutlined className="text-3xl text-neonYellow" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">이메일 문의</h3>
            <p className="mb-4 text-sm text-gray-400">
              비공개 문의, 제휴 제안, 버그 신고 등은 이메일로 연락해 주세요.
            </p>
            <a
              href="mailto:twinspa0713@gmail.com"
              className="inline-flex items-center gap-2 font-medium text-neonYellow hover:underline"
            >
              twinspa0713@gmail.com
            </a>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-[#CCFF00]/50">
            <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-[#CCFF00]/20">
              <CommentOutlined className="text-3xl text-neonYellow" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">Q&A 게시판</h3>
            <p className="mb-4 text-sm text-gray-400">
              자주 묻는 질문이나 일반적인 문의는 아래 게시판을 이용해 주세요.
            </p>
            <span className="font-medium text-neonYellow">{posts.length}개의 질문 등록됨</span>
          </div>
        </div>

        {/* Q&A Board - Question Form */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-white">
            <SendOutlined className="text-neonYellow" />
            질문 작성하기
          </h3>
          <form onSubmit={handleSubmitQuestion} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="이름 (선택, 비워두면 익명)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white transition-colors placeholder:text-gray-500 focus:border-neonYellow focus:outline-none"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="제목 *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white transition-colors placeholder:text-gray-500 focus:border-neonYellow focus:outline-none"
              />
            </div>
            <div>
              <textarea
                placeholder="질문 내용을 입력해주세요 *"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={4}
                className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white transition-colors placeholder:text-gray-500 focus:border-neonYellow focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-neonYellow py-3 font-bold text-black transition-colors hover:bg-[#bbe600] disabled:opacity-50"
            >
              {submitting ? <LoadingOutlined /> : <SendOutlined />}
              {submitting ? '등록 중...' : '질문 등록하기'}
            </button>
          </form>
        </div>

        {/* Q&A Board - Posts List */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <QuestionCircleOutlined className="text-2xl text-neonYellow" />
            <h3 className="text-xl font-bold text-white">Q&A 게시판</h3>
            <span className="ml-auto text-sm text-gray-500">{posts.length}개의 질문</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spin size="large" />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              아직 등록된 질문이 없습니다.
              <br />첫 번째 질문을 남겨보세요!
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-white/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="mb-1 font-semibold text-white">{post.title}</h4>
                      <p className="text-xs text-gray-500">
                        {post.author_name} · {formatToKoreanDate(post.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => openAnswerModal(post)}
                      className="p-2 text-gray-400 transition-colors hover:text-neonYellow"
                      title="답변 작성 (관리자)"
                    >
                      <EditOutlined />
                    </button>
                  </div>
                  <p className="mb-4 whitespace-pre-wrap text-sm text-gray-400">{post.content}</p>

                  {post.answer ? (
                    <div className="mt-3 rounded-lg border border-[#CCFF00]/30 bg-[#CCFF00]/10 p-4">
                      <p className="mb-2 text-xs font-semibold text-neonYellow">
                        ✅ 관리자 답변 ·{' '}
                        {post.answered_at ? formatToKoreanDate(post.answered_at) : ''}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-gray-300">{post.answer}</p>
                    </div>
                  ) : (
                    <div className="text-sm italic text-gray-600">답변 대기 중...</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Business Inquiry */}
        <div className="rounded-2xl border border-[#CCFF00]/30 bg-gradient-to-br from-[#CCFF00]/10 to-transparent p-6 md:p-8">
          <h3 className="mb-3 text-xl font-bold text-white">비즈니스 및 제휴 문의</h3>
          <p className="mb-4 text-gray-400">
            기업 제휴, 광고, 미디어 관련 문의는 별도의 채널로 연락해 주세요.
          </p>
          <a
            href="mailto:twinspa0713@gmail.com"
            className="inline-flex items-center gap-2 rounded-xl bg-neonYellow px-6 py-3 font-bold text-black transition-colors hover:bg-[#bbe600]"
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
          content: {
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
          },
          header: {
            backgroundColor: '#1a1a1a',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      >
        {selectedPost && (
          <div className="space-y-4">
            <div className="rounded-lg bg-white/5 p-4">
              <h4 className="mb-2 font-semibold text-white">{selectedPost.title}</h4>
              <p className="text-sm text-gray-400">{selectedPost.content}</p>
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">관리자 비밀번호</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-gray-500 focus:border-neonYellow focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">답변 내용</label>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="답변을 입력해주세요"
                rows={5}
                className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-gray-500 focus:border-neonYellow focus:outline-none"
              />
            </div>
            <button
              onClick={handleSubmitAnswer}
              disabled={answering}
              className="w-full rounded-lg bg-neonYellow py-3 font-bold text-black transition-colors hover:bg-[#bbe600] disabled:opacity-50"
            >
              {answering ? '등록 중...' : '답변 등록하기'}
            </button>
          </div>
        )}
      </Modal>
    </main>
  );
}
