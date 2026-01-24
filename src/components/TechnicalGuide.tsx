'use client';

import { useState } from 'react';
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import GlassCard from './GlassCard';
import { useTranslations } from 'next-intl';

export default function TechnicalGuide() {
  const t = useTranslations('TechnicalGuide');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-4 w-full">
      <GlassCard padding="lg" className="border-t-4 border-t-neonYellow">
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-2xl font-bold text-white">{t('title')}</h2>
          <p className="text-sm text-gray-400">{t('subtitle')}</p>
        </div>

        <div
          className={`relative overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[5000px]' : 'max-h-[200px]'}`}
        >
          <div className="space-y-8 text-justify text-sm leading-relaxed text-gray-300">
            {/* 1. How It Works (Technical Deep Dive) */}
            <div>
              <h3 className="mb-3 text-lg font-bold text-white">{t('section1_title')}</h3>
              <p className="mb-4" dangerouslySetInnerHTML={{ __html: t.raw('section1_p1') }} />
              <p className="mb-4">{t('section1_p2')}</p>
              <p>{t('section1_p3')}</p>
            </div>

            {/* 2. Architecture & Tech Stack */}
            <div>
              <h3 className="mb-3 text-lg font-bold text-white">
                {t('section2_title')}
              </h3>
              <p className="mb-4" dangerouslySetInnerHTML={{ __html: t.raw('section2_intro') }} />

              <div className="mb-4 space-y-4 rounded-xl bg-white/5 p-4">
                <div>
                  <h4 className="font-bold text-neonYellow">{t('section2_item1_title')}</h4>
                  <p className="mt-1 text-xs text-gray-400">
                    {t('section2_item1_desc')}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-neonYellow">
                    {t('section2_item2_title')}
                  </h4>
                  <p className="mt-1 text-xs text-gray-400">
                    {t('section2_item2_desc')}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-neonYellow">{t('section2_item3_title')}</h4>
                  <p className="mt-1 text-xs text-gray-400">
                    {t('section2_item3_desc')}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-neonYellow">{t('section2_item4_title')}</h4>
                  <p className="mt-1 text-xs text-gray-400">
                    {t('section2_item4_desc')}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. FAQ */}
            <div>
              <h3 className="mb-3 text-lg font-bold text-white">
                {t('faq_title')}
              </h3>
              <div className="divide-y divide-white/10">
                <div className="py-3">
                  <h4 className="mb-2 font-semibold text-white">{t('faq1_q')}</h4>
                  <p className="text-gray-400" dangerouslySetInnerHTML={{ __html: t.raw('faq1_a') }} />
                </div>
                <div className="py-3">
                  <h4 className="mb-2 font-semibold text-white">{t('faq2_q')}</h4>
                  <p className="text-gray-400" dangerouslySetInnerHTML={{ __html: t.raw('faq2_a') }} />
                </div>
                <div className="py-3">
                  <h4 className="mb-2 font-semibold text-white">
                    {t('faq3_q')}
                  </h4>
                  <p className="text-gray-400">
                    {t('faq3_a')}
                  </p>
                </div>
                <div className="py-3">
                  <h4 className="mb-2 font-semibold text-white">
                    {t('faq4_q')}
                  </h4>
                  <p className="text-gray-400">
                    {t('faq4_a')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Gradient Overlay for collapsed state */}
          {!isExpanded && (
            <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-[var(--bg-card)] via-[var(--bg-card)] to-transparent" />
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2 text-sm font-medium text-white transition-all hover:border-neonYellow/50 hover:bg-white/10"
          >
            {isExpanded ? (
              <>
                <CaretUpOutlined /> {t('collapse')}
              </>
            ) : (
              <>
                <CaretDownOutlined /> {t('expand')}
              </>
            )}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
