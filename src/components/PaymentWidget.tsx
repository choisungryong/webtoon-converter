'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslations } from 'next-intl';

interface PaymentWidgetProps {
  orderId: string;
  amount: number;
  orderName: string;
  onSuccess: () => void;
  onFail: () => void;
}

declare global {
  interface Window {
    TossPayments?: any;
  }
}

export default function PaymentWidget({
  orderId,
  amount,
  orderName,
  onSuccess,
  onFail,
}: PaymentWidgetProps) {
  const { user, refreshUser } = useAuth();
  const t = useTranslations('Payments');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Check for Toss SDK
    const initWidget = () => {
      if (!window.TossPayments || !widgetRef.current) return;

      const clientKey = (window as any).__TOSS_CLIENT_KEY__;
      if (!clientKey) {
        setError(t('sdk_not_loaded'));
        return;
      }

      try {
        const tossPayments = window.TossPayments(clientKey);
        const widgets = tossPayments.widgets({ customerKey: user?.id || 'ANONYMOUS' });

        widgets.setAmount({ currency: 'KRW', value: amount });

        widgets.renderPaymentMethods({
          selector: '#toss-payment-methods',
          variantKey: 'DEFAULT',
        });

        widgets.renderAgreement({
          selector: '#toss-agreement',
          variantKey: 'AGREEMENT',
        });

        // Store reference for later use
        (widgetRef.current as any).__widgets = widgets;
      } catch (e) {
        console.error('[PaymentWidget] Init error:', e);
        setError(t('widget_error'));
      }
    };

    // Wait for SDK to be available
    if (window.TossPayments) {
      initWidget();
    } else {
      const check = setInterval(() => {
        if (window.TossPayments) {
          clearInterval(check);
          initWidget();
        }
      }, 500);
      setTimeout(() => clearInterval(check), 10000);
    }
  }, [amount, user, t]);

  const handlePay = async () => {
    const widgets = (widgetRef.current as any)?.__widgets;
    if (!widgets) {
      setError(t('widget_error'));
      return;
    }

    try {
      const baseUrl = window.location.origin;
      await widgets.requestPayment({
        orderId,
        orderName,
        successUrl: `${baseUrl}/ko/payment/success`,
        failUrl: `${baseUrl}/ko/payment/fail`,
      });
    } catch (e: any) {
      if (e.code === 'USER_CANCEL') return;
      setError(e.message || t('payment_error'));
    }
  };

  // Handle success URL confirmation (called from success page)
  const handleConfirm = async (paymentKey: string) => {
    setConfirming(true);
    try {
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });

      if (!res.ok) throw new Error('Confirm failed');
      await refreshUser();
      onSuccess();
    } catch {
      setError(t('confirm_error'));
      onFail();
    } finally {
      setConfirming(false);
    }
  };

  // Expose handleConfirm globally for success page
  useEffect(() => {
    (window as any).__confirmPayment = handleConfirm;
    return () => {
      delete (window as any).__confirmPayment;
    };
  });

  return (
    <div ref={widgetRef}>
      <div id="toss-payment-methods" className="mb-3" />
      <div id="toss-agreement" className="mb-4" />

      {error && (
        <p className="mb-3 rounded-lg bg-red-500/10 p-2 text-center text-xs text-red-400">
          {error}
        </p>
      )}

      <button
        onClick={handlePay}
        disabled={confirming}
        className="w-full cursor-pointer rounded-xl bg-[#3182f6] py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {confirming ? t('confirming') : t('pay_btn', { amount: amount.toLocaleString() })}
      </button>
    </div>
  );
}
