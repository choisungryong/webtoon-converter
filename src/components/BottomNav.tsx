'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { HomeOutlined, PictureOutlined, QuestionCircleOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const tabs = [
  { key: 'home', icon: HomeOutlined, labelKey: 'nav_home' as const, path: '' },
  { key: 'gallery', icon: PictureOutlined, labelKey: 'nav_gallery' as const, path: '/gallery' },
  { key: 'faq', icon: QuestionCircleOutlined, labelKey: 'nav_faq' as const, path: '/faq' },
];

export default function BottomNav() {
  const t = useTranslations('Nav');
  const tAuth = useTranslations('Auth');
  const locale = useLocale();
  const pathname = usePathname();
  const { user, setShowLoginModal, setShowPricingModal } = useAuth();

  const isActive = (tabPath: string) => {
    const fullPath = `/${locale}${tabPath}`;
    if (tabPath === '') {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    return pathname.startsWith(fullPath);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-14 items-center justify-around">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={`/${locale}${tab.path}`}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
                active
                  ? 'text-[var(--accent-color)]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className={`text-lg ${active ? 'text-[var(--accent-color)]' : ''}`} />
              <span className="text-[10px] font-medium">{t(tab.labelKey)}</span>
            </Link>
          );
        })}
        {/* Profile / Login tab */}
        <button
          onClick={() => {
            if (user) {
              setShowPricingModal(true);
            } else {
              setShowLoginModal(true);
            }
          }}
          className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 border-none bg-transparent py-1 text-gray-500 transition-colors hover:text-gray-300"
        >
          {user ? (
            <>
              <span className="text-lg text-[var(--accent-color)]">🪙</span>
              <span className="text-[10px] font-medium text-[var(--accent-color)]">{user.credits.total}</span>
            </>
          ) : (
            <>
              <UserOutlined className="text-lg" />
              <span className="text-[10px] font-medium">{tAuth('login')}</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
}
