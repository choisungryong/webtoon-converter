import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Nunito } from 'next/font/google';
import Link from 'next/link';
import Script from 'next/script';
import KakaoRedirect from '../../components/KakaoRedirect';
import Footer from '../../components/Footer';
import '../globals.css';

// runtime config removed to use default nodejs_compat

const baseUrl = 'https://banatoon.app';

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
});

import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const baseUrl = 'https://banatoon.app';

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: t('title'),
      template: t('template'),
    },
    description: t('description'),
    keywords: t('keywords').split(', '),
    authors: [{ name: 'BanaToon Team', url: baseUrl }],
    creator: 'BanaToon',
    publisher: 'BanaToon',
    alternates: {
      canonical: baseUrl,
      languages: {
        'ko-KR': `${baseUrl}/ko`,
        'en-US': `${baseUrl}/en`,
      },
    },
    openGraph: {
      title: t('og_title'),
      description: t('og_description'),
      type: 'website',
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      siteName: 'BanaToon',
      url: `${baseUrl}/${locale}`,
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: t('og_alt'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('og_title'),
      description: t('og_description'),
      images: [`${baseUrl}/og-image.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: '-I-QfQxm0V7pp8333g_ffwxo_qONKpcbaP3vyhke2Ls',
    },
    category: 'technology',
    other: {
      'geo.region': locale === 'ko' ? 'KR' : 'US',
      'geo.placename': locale === 'ko' ? 'South Korea' : 'United States',
      'content-language': locale,
    },
  };
}

// JSON-LD 구조화 데이터
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'BanaToon',
  description: 'AI 기반으로 사진과 영상을 한국 웹툰 스타일로 변환해주는 무료 서비스',
  url: baseUrl,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KRW',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1000',
  },
  author: {
    '@type': 'Organization',
    name: 'BanaToon Team',
    url: baseUrl,
  },
  inLanguage: 'ko-KR',
  isAccessibleForFree: true,
};

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import ErrorBoundary from '../../components/ErrorBoundary';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!['en', 'ko'].includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#CCFF00" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`flex min-h-screen flex-col bg-[#0a0a0a] ${nunito.className}`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <Script
            src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js"
            strategy="afterInteractive"
          />
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />

          {/* Google Analytics */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
                          window.dataLayer = window.dataLayer || [];
                          function gtag(){dataLayer.push(arguments);}
                          gtag('js', new Date());
                          gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
                      `}
          </Script>
          {/* Microsoft Clarity */}
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "v47xa2v1os");
            `}
          </Script>
          <AntdRegistry>
            <KakaoRedirect />
            <ErrorBoundary>
              <main className="flex-1">{children}</main>
            </ErrorBoundary>

            {/* Footer with Navigation and Disclaimer */}
            <Footer />
          </AntdRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
