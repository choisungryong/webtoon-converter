import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import Link from 'next/link';
import Script from 'next/script';
import "./globals.css";

// runtime config removed to use default nodejs_compat

export const metadata: Metadata = {
    title: "ToonSnap - 당신의 일상을 K-웹툰으로",
    description: "AI 기반으로 사진과 영상을 한국 웹툰 스타일로 변환해주는 무료 서비스입니다. 간단한 업로드만으로 나만의 웹툰 이미지를 만들어보세요.",
    keywords: ["웹툰 변환", "AI 이미지 변환", "K-웹툰", "사진 웹툰화", "ToonSnap", "웹툰 스타일", "AI 아트"],
    authors: [{ name: "ToonSnap Team" }],
    openGraph: {
        title: "ToonSnap - 당신의 일상을 K-웹툰으로",
        description: "AI 기반으로 사진을 한국 웹툰 스타일로 변환해주는 무료 서비스",
        type: "website",
        locale: "ko_KR",
        siteName: "ToonSnap",
    },
    twitter: {
        card: "summary_large_image",
        title: "ToonSnap - 당신의 일상을 K-웹툰으로",
        description: "AI 기반으로 사진을 한국 웹툰 스타일로 변환해주는 무료 서비스",
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <head />
            <body className="bg-[#0a0a0a] min-h-screen flex flex-col" suppressHydrationWarning>
                <Script
                    src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js"
                    strategy="afterInteractive"
                />
                <Script
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6317560792339884"
                    strategy="afterInteractive"
                    crossOrigin="anonymous"
                />
                {/* Google Analytics */}
                <Script
                    src="https://www.googletagmanager.com/gtag/js?id=G-SWE71HTWN1"
                    strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'G-SWE71HTWN1');
                    `}
                </Script>
                <AntdRegistry>
                    <main className="flex-1">
                        {children}
                    </main>

                    {/* Footer with Navigation and Disclaimer */}
                    <footer className="border-t border-white/10 py-8 px-4">
                        <div className="max-w-4xl mx-auto">
                            {/* Navigation Links */}
                            <nav className="flex flex-wrap justify-center gap-4 md:gap-8 mb-6">
                                <Link href="/about" className="text-gray-400 hover:text-[#CCFF00] transition-colors text-sm">
                                    서비스 소개
                                </Link>
                                <Link href="/gallery" className="text-gray-400 hover:text-[#CCFF00] transition-colors text-sm">
                                    갤러리
                                </Link>
                                <Link href="/privacy" className="text-gray-400 hover:text-[#CCFF00] transition-colors text-sm">
                                    개인정보처리방침
                                </Link>
                                <Link href="/terms" className="text-gray-400 hover:text-[#CCFF00] transition-colors text-sm">
                                    이용약관
                                </Link>
                                <Link href="/contact" className="text-gray-400 hover:text-[#CCFF00] transition-colors text-sm">
                                    문의하기
                                </Link>
                            </nav>

                            {/* Disclaimer */}
                            <p className="text-gray-500 text-xs max-w-2xl mx-auto text-center mb-4">
                                본 서비스에서 제공하는 스타일은 AI가 학습한 데이터를 기반으로 재창조된 것이며,
                                특정 브랜드나 작가와는 무관합니다.
                            </p>

                            {/* Copyright */}
                            <p className="text-gray-600 text-xs text-center">
                                © 2026 ToonSnap. All rights reserved.
                            </p>
                        </div>
                    </footer>
                </AntdRegistry>
            </body>
        </html>
    );
}

