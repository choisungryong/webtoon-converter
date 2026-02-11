'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface PricingCardProps {
  packageId: string;
  credits: number;
  bonus: number;
  price: number;
  popular?: boolean;
  selected: boolean;
  loading: boolean;
  onSelect: (id: string) => void;
}

export default function PricingCard({
  packageId,
  credits,
  bonus,
  price,
  popular,
  selected,
  loading,
  onSelect,
}: PricingCardProps) {
  const t = useTranslations('Payments');

  const totalCredits = credits + bonus;
  const pricePerCredit = Math.round(price / totalCredits);

  return (
    <button
      onClick={() => onSelect(packageId)}
      disabled={loading}
      className={`relative cursor-pointer rounded-xl border p-4 text-left transition-all ${
        selected
          ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      } ${loading ? 'animate-pulse opacity-70' : ''}`}
    >
      {popular && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent-color)] px-2 py-0.5 text-[10px] font-bold text-black">
          {t('popular')}
        </span>
      )}

      <div className="mb-2 text-2xl font-bold text-white">
        {totalCredits}
        <span className="ml-1 text-xs font-normal text-gray-400">{t('credits_unit')}</span>
      </div>

      {bonus > 0 && (
        <div className="mb-2 text-xs text-[var(--accent-color)]">
          +{bonus} {t('bonus')}
        </div>
      )}

      <div className="text-lg font-bold text-white">
        {price.toLocaleString()}
        <span className="ml-0.5 text-xs font-normal text-gray-400">{t('currency')}</span>
      </div>

      <div className="mt-1 text-[11px] text-gray-500">
        {t('per_credit', { price: pricePerCredit })}
      </div>
    </button>
  );
}
