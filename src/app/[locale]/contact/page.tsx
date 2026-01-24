'use client';

export const runtime = 'edge';

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
import { useTranslations } from 'next-intl';
import { formatToKoreanDate } from '../../../utils/dateUtils';

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
  const t = useTranslations('Contact');
  const tCommon = useTranslations('Gallery'); // Reusing home_link if needed, or stick to Contact namespace if it has it.

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
      message.warning(t('messages.required_fields'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/qna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: authorName.trim() || 'Anonymous', // Assuming anonymous fallback
          title: title.trim(),
          content: content.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        message.success(t('messages.submit_success'));
        setAuthorName('');
        setTitle('');
        setContent('');
        fetchPosts();
      } else {
        message.error(data.error || t('messages.submit_fail'));
      }
    } catch (error) {
      message.error(t('messages.network_error'));
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
      message.warning(t('messages.admin_required'));
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
        message.success(t('messages.answer_success'));
        setAnswerModalOpen(false);
        fetchPosts();
      } else {
        message.error(data.error || t('messages.answer_fail'));
      }
    } catch (error) {
      message.error(t('messages.network_error'));
    } finally {
      setAnswering(false);
    }
  };

  return (
    <main className="bg-[#0a0a0a] p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/" className="text-gray-400 transition-colors hover:text-white">
            {tCommon('home_link')}
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {t('title_prefix')}<span className="text-neonYellow">{t('title_suffix')}</span>
          </h1>
        </div>

        {/* Hero */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h2 className="mb-3 text-2xl font-bold text-white">{t('hero_title')}</h2>
          <p className="mx-auto max-w-xl text-gray-400">
            {t('hero_desc')}
          </p>
        </div>

        {/* Contact Methods */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-[#CCFF00]/50">
            <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-[#CCFF00]/20">
              <MailOutlined className="text-3xl text-neonYellow" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">{t('email_title')}</h3>
            <p className="mb-4 text-sm text-gray-400">
              {t('email_desc')}
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
            <h3 className="mb-2 text-lg font-bold text-white">{t('qna_title')}</h3>
            <p className="mb-4 text-sm text-gray-400">
              {t('qna_desc')}
            </p>
            <span className="font-medium text-neonYellow">{t('qna_count', { count: posts.length })}</span>
          </div>
        </div>

        {/* Q&A Board - Question Form */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-white">
            <SendOutlined className="text-neonYellow" />
            {t('form_title')}
          </h3>
          <form onSubmit={handleSubmitQuestion} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder={t('form_name_placeholder')}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white transition-colors placeholder:text-gray-500 focus:border-neonYellow focus:outline-none"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder={t('form_title_placeholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white transition-colors placeholder:text-gray-500 focus:border-neonYellow focus:outline-none"
              />
            </div>
            <div>
              <textarea
                placeholder={t('form_content_placeholder')}
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
              {submitting ? t('submitting') : t('submit_btn')}
            </button>
          </form>
        </div>

        {/* Q&A Board - Posts List */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <QuestionCircleOutlined className="text-2xl text-neonYellow" />
            <h3 className="text-xl font-bold text-white">{t('qna_list_title')}</h3>
            <span className="ml-auto text-sm text-gray-500">{t('qna_list_count', { count: posts.length })}</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spin size="large" />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center text-gray-500" dangerouslySetInnerHTML={{ __html: t.raw('no_posts') }}>
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
                      title="Answer (Admin)"
                    >
                      <EditOutlined />
                    </button>
                  </div>
                  <p className="mb-4 whitespace-pre-wrap text-sm text-gray-400">{post.content}</p>

                  {post.answer ? (
                    <div className="mt-3 rounded-lg border border-[#CCFF00]/30 bg-[#CCFF00]/10 p-4">
                      <p className="mb-2 text-xs font-semibold text-neonYellow">
                        {t('admin_answer_badge')} ·{' '}
                        {post.answered_at ? formatToKoreanDate(post.answered_at) : ''}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-gray-300">{post.answer}</p>
                    </div>
                  ) : (
                    <div className="text-sm italic text-gray-600">{t('waiting_answer')}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Business Inquiry */}
        <div className="rounded-2xl border border-[#CCFF00]/30 bg-gradient-to-br from-[#CCFF00]/10 to-transparent p-6 md:p-8">
          <h3 className="mb-3 text-xl font-bold text-white">{t('biz_title')}</h3>
          <p className="mb-4 text-gray-400">
            {t('biz_desc')}
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
        title={<span className="text-white">{t('admin_modal_title')}</span>}
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
              <label className="mb-2 block text-sm text-gray-400">{t('admin_pwd_label')}</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder={t('admin_pwd_placeholder')}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-gray-500 focus:border-neonYellow focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-400">{t('admin_answer_label')}</label>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder={t('admin_answer_placeholder')}
                rows={5}
                className="w-full resize-none rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-gray-500 focus:border-neonYellow focus:outline-none"
              />
            </div>
            <button
              onClick={handleSubmitAnswer}
              disabled={answering}
              className="w-full rounded-lg bg-neonYellow py-3 font-bold text-black transition-colors hover:bg-[#bbe600] disabled:opacity-50"
            >
              {answering ? t('submitting') : t('admin_submit_btn')}
            </button>
          </div>
        )}
      </Modal>
    </main>
  );
}
