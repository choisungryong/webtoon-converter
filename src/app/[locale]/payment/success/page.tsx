'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const t = useTranslations('Payments');
  const [status, setStatus] = useState<'confirming' | 'success' | 'error'>('confirming');
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: parseInt(amount, 10),
          }),
        });

        if (!res.ok) throw new Error('Confirm failed');
        const data = await res.json();
        setCredits(data.credits || 0);
        setStatus('success');
        await refreshUser();
      } catch {
        setStatus('error');
      }
    })();
  }, [searchParams, refreshUser]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a2e] p-8 text-center shadow-xl">
        {status === 'confirming' && (
          <>
            <div className="mb-4 text-4xl">⏳</div>
            <h1 className="text-lg font-bold text-white">{t('confirming')}</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-4 text-5xl">🎉</div>
            <h1 className="mb-2 text-xl font-bold text-white">{t('success_title')}</h1>
            <p className="mb-6 text-sm text-gray-400">
              {t('success_desc', { credits })}
            </p>
            <Link
              href="/"
              className="inline-block rounded-xl bg-[var(--accent-color)] px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              {t('go_home')}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4 text-5xl">😔</div>
            <h1 className="mb-2 text-xl font-bold text-white">{t('error_title')}</h1>
            <p className="mb-6 text-sm text-gray-400">{t('error_desc')}</p>
            <Link
              href="/"
              className="inline-block rounded-xl border border-white/20 px-6 py-3 text-sm text-white transition-colors hover:bg-white/10"
            >
              {t('go_home')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
