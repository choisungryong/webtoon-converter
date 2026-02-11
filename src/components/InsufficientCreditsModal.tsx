'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslations } from 'next-intl';

interface InsufficientCreditsModalProps {
  show: boolean;
  onClose: () => void;
  requiredCredits: number;
}

export default function InsufficientCreditsModal({
  show,
  onClose,
  requiredCredits,
}: InsufficientCreditsModalProps) {
  const { user, setShowLoginModal, setShowPricingModal } = useAuth();
  const t = useTranslations('Credits');

  if (!show) return null;

  const isAnonymous = !user;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 text-center text-4xl">🪙</div>
        <h2 className="mb-2 text-center text-lg font-bold text-white">
          {t('insufficient_title')}
        </h2>
        <p className="mb-4 text-center text-sm text-gray-400">
          {isAnonymous
            ? t('anonymous_limit_desc')
            : t('insufficient_desc', { required: requiredCredits, current: user.credits.total })}
        </p>

        {isAnonymous ? (
          <button
            onClick={() => {
              onClose();
              setShowLoginModal(true);
            }}
            className="w-full cursor-pointer rounded-xl bg-[var(--accent-color)] py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            {t('login_for_credits')}
          </button>
        ) : (
          <button
            onClick={() => {
              onClose();
              setShowPricingModal(true);
            }}
            className="w-full cursor-pointer rounded-xl bg-[var(--accent-color)] py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            {t('buy_credits_btn')}
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-3 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent py-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
}
