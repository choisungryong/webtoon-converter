'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Spin } from 'antd';

function ShareContent() {
    const searchParams = useSearchParams();
    const imageUrl = searchParams.get('image');

    if (!imageUrl) {
        return (
            <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">
                        이미지를 찾을 수 없습니다
                    </h1>
                    <Link href="/">
                        <button className="px-6 py-3 bg-[#CCFF00] text-black rounded-xl font-bold hover:scale-105 transition-transform">
                            🍌 BanaToon 시작하기
                        </button>
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#0a0a0a] flex flex-col">
            {/* Header */}
            <header className="p-4 border-b border-white/10">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl">🍌</span>
                        <span className="text-xl font-bold text-[#CCFF00]">BanaToon</span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
                {/* Shared Image */}
                <div className="w-full max-w-lg mb-6">
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-[#CCFF00]/10 border border-white/10">
                        <img
                            src={decodeURIComponent(imageUrl)}
                            alt="공유된 웹툰 이미지"
                            className="w-full h-auto"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder.png';
                            }}
                        />
                    </div>
                </div>

                {/* Info Text */}
                <div className="text-center mb-8">
                    <p className="text-gray-400 text-sm mb-2">
                        친구가 BanaToon으로 만든 웹툰 스타일 이미지예요!
                    </p>
                    <p className="text-white text-lg font-medium">
                        나만의 웹툰도 만들어볼까요? 🎨
                    </p>
                </div>

                {/* CTA Button */}
                <Link href="/">
                    <button className="px-8 py-4 bg-gradient-to-r from-[#CCFF00] to-[#a8d900] text-black rounded-2xl font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#CCFF00]/30 flex items-center gap-3">
                        <span className="text-2xl">🍌</span>
                        나도 만들러 가기
                    </button>
                </Link>

                {/* Features Preview */}
                <div className="mt-12 grid grid-cols-3 gap-4 text-center max-w-md">
                    <div className="p-3">
                        <div className="text-2xl mb-2">📸</div>
                        <p className="text-xs text-gray-400">사진 업로드</p>
                    </div>
                    <div className="p-3">
                        <div className="text-2xl mb-2">🎬</div>
                        <p className="text-xs text-gray-400">AI 변환</p>
                    </div>
                    <div className="p-3">
                        <div className="text-2xl mb-2">✨</div>
                        <p className="text-xs text-gray-400">웹툰 완성</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="p-4 border-t border-white/10">
                <p className="text-center text-gray-500 text-xs">
                    © 2026 BanaToon. 일상의 바이브를 툰으로 담는다.
                </p>
            </footer>
        </main>
    );
}

export default function SharePage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <Spin size="large" />
            </main>
        }>
            <ShareContent />
        </Suspense>
    );
}
