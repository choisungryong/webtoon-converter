import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import Link from 'next/link';
import Script from 'next/script';
import KakaoRedirect from '../components/KakaoRedirect';
import './globals.css';

// runtime config removed to use default nodejs_compat

const baseUrl = 'https://banatoon.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'BanaToon - 일상의 바이브를 툰으로 담는다',
    template: '%s | BanaToon',
  },
  description:
    'AI 기반으로 사진과 영상을 한국 웹툰 스타일로 변환해주는 무료 서비스입니다. 간단한 업로드만으로 나만의 웹툰 이미지를 만들어보세요.',
  keywords: [
    '웹툰 변환',
    'AI 이미지 변환',
    'K-웹툰',
    '사진 웹툰화',
    'BanaToon',
    '웹툰 스타일',
    'AI 아트',
    '무료 웹툰',
    '사진 변환',
    'AI 그림',
  ],
  authors: [{ name: 'BanaToon Team', url: baseUrl }],
  creator: 'BanaToon',
  publisher: 'BanaToon',
  alternates: {
    canonical: baseUrl,
    languages: {
      'ko-KR': baseUrl,
    },
  },
  openGraph: {
    title: 'BanaToon - 일상의 바이브를 툰으로 담는다',
    description: 'AI 기반으로 사진을 한국 웹툰 스타일로 변환해주는 무료 서비스',
    type: 'website',
    locale: 'ko_KR',
    siteName: 'BanaToon',
    url: baseUrl,
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'BanaToon - AI 웹툰 변환 서비스',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BanaToon - 일상의 바이브를 툰으로 담는다',
    description: 'AI 기반으로 사진을 한국 웹툰 스타일로 변환해주는 무료 서비스',
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
    google: '-I-QfQxm0V7pp8333g_ffwxo_qONKpcbaP3vyhke2Ls', // Google Search Console 인증 코드로 교체 필요
  },
  category: 'technology',
  other: {
    'geo.region': 'KR',
    'geo.placename': 'South Korea',
    'content-language': 'ko',
  },
};

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
      <body className="flex min-h-screen flex-col bg-[#0a0a0a]" suppressHydrationWarning>
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
        <AntdRegistry>
          <KakaoRedirect />
          <main className="flex-1">{children}</main>

          {/* Footer with Navigation and Disclaimer */}
          <footer className="border-t border-white/10 px-4 py-8">
            <div className="mx-auto max-w-4xl">
              {/* Navigation Links */}
              <nav className="mb-6 flex flex-wrap justify-center gap-4 md:gap-8">
                <Link
                  href="/about"
                  className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
                >
                  서비스 소개
                </Link>
                <Link
                  href="/gallery"
                  className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
                >
                  갤러리
                </Link>
                <Link
                  href="/faq"
                  className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
                >
                  FAQ
                </Link>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
                >
                  개인정보처리방침
                </Link>
                <Link
                  href="/terms"
                  className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
                >
                  이용약관
                </Link>
                <Link
                  href="/contact"
                  className="text-sm text-gray-400 transition-colors hover:text-neonYellow"
                >
                  문의하기
                </Link>
              </nav>

              {/* Disclaimer */}
              <p className="mx-auto mb-4 max-w-2xl text-center text-xs text-gray-500">
                본 서비스에서 제공하는 스타일은 AI가 학습한 데이터를 기반으로 재창조된 것이며, 특정
                브랜드나 작가와는 무관합니다.
              </p>

              <p className="text-center text-xs text-gray-600">
                © 2026 BanaToon. All rights reserved.
              </p>
            </div>
          </footer>
        </AntdRegistry>
      </body>
    </html>
  );
}
