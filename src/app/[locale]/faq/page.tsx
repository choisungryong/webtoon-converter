'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function FAQPage() {
  const t = useTranslations('FAQPage');
  const tCommon = useTranslations('Gallery');

  // Cast raw items to array of objects
  const faqList = t.raw('items') as Array<{ q: string; a: string }>;

  return (
    <main className="bg-[#0a0a0a] p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/" className="text-gray-400 transition-colors hover:text-white">
            {tCommon('home_link')}
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {t('title_prefix')} <span className="text-neonYellow">{t('title_suffix')}</span>
          </h1>
        </div>

        {/* Content */}
        <div className="space-y-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-300 md:p-8">
          <div className="mb-8 border-b border-white/10 pb-8">
            <h2 className="mb-4 text-xl font-bold text-white">{t('guide_title')}</h2>
            <p className="leading-relaxed text-gray-400">
              {t('guide_desc')}
            </p>
          </div>

          <div className="space-y-10">
            {faqList.map((item, idx) => (
              <div key={idx} className="border-b border-white/10 pb-8 last:border-0">
                <h3 className="mb-4 text-lg font-semibold text-neonYellow">Q. {item.q}</h3>
                <p className="whitespace-pre-wrap leading-relaxed text-gray-300">{item.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-lg bg-white/5 p-4 text-center">
            <p className="text-sm text-gray-400">
              {t('cta_text')}{' '}
              <Link href="/contact" className="text-neonYellow hover:underline">
                {t('cta_link')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
