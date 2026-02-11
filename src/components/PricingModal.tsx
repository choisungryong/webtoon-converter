'use client';

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslations } from 'next-intl';
import PricingCard from './PricingCard';
import PaymentWidget from './PaymentWidget';

const PACKAGES = [
  { id: 'starter', credits: 10, bonus: 0, price: 1900 },
  { id: 'basic', credits: 30, bonus: 3, price: 4900, popular: true },
  { id: 'pro', credits: 60, bonus: 10, price: 9900 },
  { id: 'mega', credits: 150, bonus: 30, price: 19900 },
];

export default function PricingModal() {
  const { showPricingModal, setShowPricingModal, user } = useAuth();
  const t = useTranslations('Payments');
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<{
    orderId: string;
    amount: number;
    orderName: string;
  } | null>(null);
  const [preparing, setPreparing] = useState(false);

  if (!showPricingModal) return null;

  const handleSelect = async (packageId: string) => {
    if (!user) return;
    setSelectedPackage(packageId);
    setPreparing(true);

    try {
      const res = await fetch('/api/payments/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageId }),
      });

      if (!res.ok) throw new Error('Prepare failed');
      const data = await res.json();
      setPaymentData(data);
    } catch {
      setSelectedPackage(null);
    } finally {
      setPreparing(false);
    }
  };

  const handleClose = () => {
    setShowPricingModal(false);
    setSelectedPackage(null);
    setPaymentData(null);
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-center text-xl font-bold text-white">{t('title')}</h2>
        <p className="mb-6 text-center text-sm text-gray-400">{t('subtitle')}</p>

        {!paymentData ? (
          <div className="grid grid-cols-2 gap-3">
            {PACKAGES.map((pkg) => (
              <PricingCard
                key={pkg.id}
                packageId={pkg.id}
                credits={pkg.credits}
                bonus={pkg.bonus}
                price={pkg.price}
                popular={pkg.popular}
                selected={selectedPackage === pkg.id}
                loading={preparing && selectedPackage === pkg.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ) : (
          <PaymentWidget
            orderId={paymentData.orderId}
            amount={paymentData.amount}
            orderName={paymentData.orderName}
            onSuccess={handleClose}
            onFail={() => {
              setPaymentData(null);
              setSelectedPackage(null);
            }}
          />
        )}

        <button
          onClick={handleClose}
          className="mt-4 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent py-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
}
