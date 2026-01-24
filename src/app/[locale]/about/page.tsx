'use client';

import Link from 'next/link';
import {
  CheckCircleFilled,
  ThunderboltFilled,
  SmileFilled,
  PictureFilled,
  StarFilled,
  ShareAltOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';

export default function AboutPage() {
  const t = useTranslations('About');
  const tCommon = useTranslations('Gallery'); // using this for 'home_link'

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

        {/* Hero Section */}
        <div className="mb-8 rounded-2xl border border-[#CCFF00]/30 bg-gradient-to-br from-[#CCFF00]/20 to-transparent p-8 text-center md:p-12">
          <h2
            className="mb-4 text-4xl font-black text-white md:text-5xl"
            dangerouslySetInnerHTML={{ __html: t.raw('hero_title') }}
          />
          <p
            className="mb-6 text-xl text-gray-300"
            dangerouslySetInnerHTML={{ __html: t.raw('hero_slogan') }}
          />
          <p className="mx-auto max-w-2xl leading-relaxed text-gray-400">
            {t('hero_desc')}
          </p>
        </div>

        {/* Features - 6 cards for even grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#CCFF00]/20">
              <ThunderboltFilled className="text-2xl text-neonYellow" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">{t('feature1_title')}</h3>
            <p className="text-sm leading-relaxed text-gray-400">
              {t('feature1_desc')}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#CCFF00]/20">
              <PictureFilled className="text-2xl text-neonYellow" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">{t('feature2_title')}</h3>
            <p className="text-sm leading-relaxed text-gray-400">
              {t('feature2_desc')}
            </p>
          </div>

          <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-blue-500/10 p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-500/30">
              <StarFilled className="text-2xl text-purple-400" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">{t('feature3_title')}</h3>
            <p
              className="text-sm leading-relaxed text-gray-400"
              dangerouslySetInnerHTML={{ __html: t.raw('feature3_desc') }}
            />
          </div>

          <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-yellow-500/30">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">{t('feature4_title')}</h3>
            <p
              className="text-sm leading-relaxed text-gray-400"
              dangerouslySetInnerHTML={{ __html: t.raw('feature4_desc') }}
            />
          </div>

          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-500/30">
              <ShareAltOutlined className="text-2xl text-blue-400" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">{t('feature5_title')}</h3>
            <p
              className="text-sm leading-relaxed text-gray-400"
              dangerouslySetInnerHTML={{ __html: t.raw('feature5_desc') }}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#CCFF00]/20">
              <SmileFilled className="text-2xl text-neonYellow" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">{t('feature6_title')}</h3>
            <p className="text-sm leading-relaxed text-gray-400">
              {t('feature6_desc')}
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h3 className="mb-6 text-center text-xl font-bold text-white">{t('how_title')}</h3>
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex-1 text-center">
              <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-neonYellow text-2xl font-bold text-black">
                1
              </div>
              <p className="mb-1 font-semibold text-white">{t('how_step1')}</p>
              <p className="text-sm text-gray-400">{t('how_step1_desc')}</p>
            </div>
            <div className="hidden text-2xl text-gray-600 md:block">→</div>
            <div className="flex-1 text-center">
              <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-neonYellow text-2xl font-bold text-black">
                2
              </div>
              <p className="mb-1 font-semibold text-white">{t('how_step2')}</p>
              <p className="text-sm text-gray-400">{t('how_step2_desc')}</p>
            </div>
            <div className="hidden text-2xl text-gray-600 md:block">→</div>
            <div className="flex-1 text-center">
              <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-neonYellow text-2xl font-bold text-black">
                3
              </div>
              <p className="mb-1 font-semibold text-white">{t('how_step3')}</p>
              <p className="text-sm text-gray-400">{t('how_step3_desc')}</p>
            </div>
          </div>
        </div>

        {/* Mission */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h3 className="mb-4 text-xl font-bold text-white">{t('mission_title')}</h3>
          <p className="mb-4 leading-relaxed text-gray-300">
            {t('mission_desc1')}
          </p>
          <p className="leading-relaxed text-gray-400">
            {t('mission_desc2')}
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block rounded-xl bg-neonYellow px-8 py-4 text-lg font-bold text-black transition-colors hover:bg-[#bbe600]"
          >
            {t('cta_btn')}
          </Link>
        </div>
      </div>
    </main>
  );
}
