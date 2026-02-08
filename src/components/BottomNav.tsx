'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { HomeOutlined, PictureOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const tabs = [
  { key: 'home', icon: HomeOutlined, labelKey: 'nav_home' as const, path: '' },
  { key: 'gallery', icon: PictureOutlined, labelKey: 'nav_gallery' as const, path: '/gallery' },
  { key: 'faq', icon: QuestionCircleOutlined, labelKey: 'nav_faq' as const, path: '/faq' },
];

export default function BottomNav() {
  const t = useTranslations('Nav');
  const locale = useLocale();
  const pathname = usePathname();

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
      </div>
    </nav>
  );
}
