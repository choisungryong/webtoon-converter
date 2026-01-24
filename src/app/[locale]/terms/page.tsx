'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function TermsPage() {
  const t = useTranslations('Terms');
  const tCommon = useTranslations('Gallery');

  return (
    <main className="bg-[#0a0a0a] p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/" className="text-gray-400 transition-colors hover:text-white">
            {tCommon('home_link')}
          </Link>
          <h1
            className="text-2xl font-bold text-white"
            dangerouslySetInnerHTML={{ __html: t.raw('title') }}
          />
        </div>

        {/* Content */}
        <div className="space-y-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-300 md:p-8">
          <section>
            <p className="mb-6 text-sm text-gray-400">{t('last_updated')}</p>
            <p className="leading-relaxed">
              {t('intro')}
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('article1_title')}</h2>
            <p className="leading-relaxed">
              {t('article1_desc')}
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('article2_title')}</h2>
            <ul className="list-inside list-disc space-y-2 text-gray-400">
              <li dangerouslySetInnerHTML={{ __html: t.raw('article2_item1') }} />
              <li dangerouslySetInnerHTML={{ __html: t.raw('article2_item2') }} />
              <li dangerouslySetInnerHTML={{ __html: t.raw('article2_item3') }} />
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('article3_title')}</h2>
            <p className="mb-4 leading-relaxed">{t('article3_desc')}</p>
            <ul className="list-inside list-disc space-y-2 text-gray-400">
              <li>{t('article3_item1')}</li>
              <li>{t('article3_item2')}</li>
              <li>{t('article3_item3')}</li>
              <li>{t('article3_item4')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('article4_title')}</h2>
            <p className="mb-4 leading-relaxed">
              {t('article4_desc')}
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-400">
              <li>{t('article4_item1')}</li>
              <li>{t('article4_item2')}</li>
              <li>{t('article4_item3')}</li>
              <li>{t('article4_item4')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('article5_title')}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-white">{t('article5_sub1_title')}</h3>
                <p className="text-gray-400">
                  {t('article5_sub1_desc')}
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-white">{t('article5_sub2_title')}</h3>
                <p className="text-gray-400">
                  {t('article5_sub2_desc')}
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-white">{t('article5_sub3_title')}</h3>
                <p className="text-gray-400">
                  {t('article5_sub3_desc')}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('article6_title')}</h2>
            <ul className="list-inside list-disc space-y-2 text-gray-400">
              <li>{t('article6_item1')}</li>
              <li>{t('article6_item2')}</li>
              <li>{t('article6_item3')}</li>
              <li>{t('article6_item4')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('article7_title')}</h2>
            <p className="leading-relaxed">
              {t('article7_desc')}
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('article8_title')}</h2>
            <p className="leading-relaxed">
              {t('article8_desc')}
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('article9_title')}</h2>
            <p className="leading-relaxed">
              {t('article9_desc')}
            </p>
          </section>

          <div className="border-t border-white/10 pt-6">
            <p className="text-sm text-gray-500">
              {t('footer_note')}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
