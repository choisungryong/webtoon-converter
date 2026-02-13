'use client';

export const runtime = 'edge';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const t = useTranslations('Payments');
  const errorCode = searchParams.get('code') || '';
  const errorMessage = searchParams.get('message') || t('fail_default');

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a2e] p-8 text-center shadow-xl">
        <div className="mb-4 text-5xl">😔</div>
        <h1 className="mb-2 text-xl font-bold text-white">{t('fail_title')}</h1>
        <p className="mb-1 text-sm text-gray-400">{errorMessage}</p>
        {errorCode && (
          <p className="mb-6 text-xs text-gray-600">code: {errorCode}</p>
        )}
        <Link
          href="/"
          className="inline-block rounded-xl border border-white/20 px-6 py-3 text-sm text-white transition-colors hover:bg-white/10"
        >
          {t('go_home')}
        </Link>
      </div>
    </div>
  );
}
