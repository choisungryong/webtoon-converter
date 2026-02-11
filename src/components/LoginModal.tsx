'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslations } from 'next-intl';

export default function LoginModal() {
  const { showLoginModal, setShowLoginModal, login } = useAuth();
  const t = useTranslations('Auth');

  if (!showLoginModal) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setShowLoginModal(false)}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-center text-xl font-bold text-white">{t('login_title')}</h2>
        <p className="mb-6 text-center text-sm text-gray-400">{t('login_desc')}</p>

        <div className="flex flex-col gap-3">
          {/* Kakao Login */}
          <button
            onClick={() => login('kakao')}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#FEE500] px-4 py-3.5 text-sm font-semibold text-[#191919] transition-opacity hover:opacity-90"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 3C5.58 3 2 5.79 2 9.21c0 2.17 1.45 4.08 3.63 5.17l-.92 3.37c-.08.28.25.51.5.35l3.96-2.64c.27.03.55.05.83.05 4.42 0 8-2.79 8-6.21S14.42 3 10 3z"
                fill="#191919"
              />
            </svg>
            {t('login_kakao')}
          </button>

          {/* Google Login */}
          <button
            onClick={() => login('google')}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-white/20 bg-white px-4 py-3.5 text-sm font-semibold text-gray-700 transition-opacity hover:opacity-90"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path
                d="M19.6 10.23c0-.68-.06-1.36-.17-2.02H10v3.84h5.38a4.6 4.6 0 01-2 3.02v2.5h3.24c1.89-1.74 2.98-4.3 2.98-7.34z"
                fill="#4285F4"
              />
              <path
                d="M10 20c2.7 0 4.96-.9 6.62-2.43l-3.24-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.58-4.12H1.08v2.58A9.99 9.99 0 0010 20z"
                fill="#34A853"
              />
              <path
                d="M4.42 12.06a5.99 5.99 0 010-3.82V5.66H1.08a9.99 9.99 0 000 8.98l3.34-2.58z"
                fill="#FBBC05"
              />
              <path
                d="M10 3.96c1.47 0 2.78.5 3.82 1.5l2.86-2.86A9.99 9.99 0 0010 0 9.99 9.99 0 001.08 5.66l3.34 2.58C5.2 5.72 7.4 3.96 10 3.96z"
                fill="#EA4335"
              />
            </svg>
            {t('login_google')}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">{t('login_bonus')}</p>

        <button
          onClick={() => setShowLoginModal(false)}
          className="mt-4 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent py-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          {t('login_later')}
        </button>
      </div>
    </div>
  );
}
