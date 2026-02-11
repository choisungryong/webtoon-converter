'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslations } from 'next-intl';

export default function UserMenu() {
  const { user, logout, setShowPricingModal } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('Auth');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!user) return null;

  const initial = (user.nickname || user.email || '?')[0].toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm font-bold text-[var(--accent-color)] transition-colors hover:bg-[var(--accent-color)] hover:text-black"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="size-full rounded-full object-cover"
          />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 min-w-[200px] rounded-xl border border-white/10 bg-[#1a1a2e] p-2 shadow-xl">
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-sm font-medium text-white">{user.nickname || t('anonymous')}</p>
            <p className="text-xs text-gray-400">{user.email || user.provider}</p>
          </div>

          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-xs text-gray-400">{t('credits')}</p>
            <p className="text-lg font-bold text-[var(--accent-color)]">
              {user.credits.total}
              <span className="ml-1 text-xs font-normal text-gray-400">
                ({t('free')}: {user.credits.free} / {t('paid')}: {user.credits.paid})
              </span>
            </p>
          </div>

          <button
            onClick={() => {
              setShowPricingModal(true);
              setOpen(false);
            }}
            className="mt-1 w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/10"
          >
            {t('buy_credits')}
          </button>

          <button
            onClick={() => {
              logout();
              setOpen(false);
            }}
            className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-white/10"
          >
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}
