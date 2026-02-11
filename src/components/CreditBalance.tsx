'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function CreditBalance() {
  const { user, setShowPricingModal } = useAuth();

  if (!user) return null;

  return (
    <button
      onClick={() => setShowPricingModal(true)}
      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--accent-color)]/30 bg-[var(--accent-color)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--accent-color)] transition-colors hover:bg-[var(--accent-color)]/20"
    >
      <span className="text-base">🪙</span>
      <span>{user.credits.total}</span>
    </button>
  );
}
