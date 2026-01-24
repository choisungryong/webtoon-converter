'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function PrivacyPage() {
  const t = useTranslations('Privacy');
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
            <h2 className="mb-4 text-xl font-bold text-white">{t('section1_title')}</h2>
            <p className="mb-4 leading-relaxed">
              {t('section1_desc')}
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-400">
              <li dangerouslySetInnerHTML={{ __html: t.raw('section1_item1') }} />
              <li dangerouslySetInnerHTML={{ __html: t.raw('section1_item2') }} />
              <li dangerouslySetInnerHTML={{ __html: t.raw('section1_item3') }} />
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('section2_title')}</h2>
            <ul className="list-inside list-disc space-y-2 text-gray-400">
              <li>{t('section2_item1')}</li>
              <li>{t('section2_item2')}</li>
              <li>{t('section2_item3')}</li>
              <li>{t('section2_item4')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('section3_title')}</h2>
            <div className="mb-4 rounded-lg border border-[#CCFF00]/30 bg-[#CCFF00]/10 p-4">
              <p className="mb-2 font-semibold text-neonYellow">{t('section3_box_title')}</p>
              <p
                className="text-sm leading-relaxed text-gray-300"
                dangerouslySetInnerHTML={{ __html: t.raw('section3_box_desc') }}
              />
            </div>
            <p className="mb-4 leading-relaxed">
              {t('section3_desc')}
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-400">
              <li dangerouslySetInnerHTML={{ __html: t.raw('section3_item1') }} />
              <li dangerouslySetInnerHTML={{ __html: t.raw('section3_item2') }} />
              <li dangerouslySetInnerHTML={{ __html: t.raw('section3_item3') }} />
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('section4_title')}</h2>
            <p className="mb-4 leading-relaxed">
              {t('section4_desc')}
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-400">
              <li>{t('section4_item1')}</li>
              <li>{t('section4_item2')}</li>
              <li>{t('section4_item3')}</li>
            </ul>
            <div className="mt-4 rounded-lg bg-white/5 p-4">
              <p
                className="text-sm text-gray-400"
                dangerouslySetInnerHTML={{ __html: t.raw('section4_box_desc') }}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('section5_title')}</h2>
            <p className="mb-4 leading-relaxed">
              {t('section5_desc')}
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-400">
              <li dangerouslySetInnerHTML={{ __html: t.raw('section5_item1') }} />
              <li>{t('section5_item2')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('section6_title')}</h2>
            <p className="mb-4 leading-relaxed">
              {t('section6_desc')}
            </p>
            <ul className="list-inside list-disc space-y-2 text-gray-400">
              <li>{t('section6_item1')}</li>
              <li>{t('section6_item2')}</li>
              <li>{t('section6_item3')}</li>
            </ul>
            <p
              className="mt-4 text-gray-400"
              dangerouslySetInnerHTML={{ __html: t.raw('section6_note') }}
            />
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('section7_title')}</h2>
            <div className="rounded-lg bg-white/5 p-4">
              <p
                className="text-gray-400"
                dangerouslySetInnerHTML={{ __html: t.raw('section7_box_desc') }}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">{t('section8_title')}</h2>
            <p className="leading-relaxed">
              {t('section8_desc')}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
