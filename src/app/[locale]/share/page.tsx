'use client';

export const runtime = 'edge';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Spin } from 'antd';

function ShareContent() {
  const searchParams = useSearchParams();
  const imageUrl = searchParams.get('image');
  const [hasError, setHasError] = useState(false);

  if (!imageUrl) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-white">이미지를 찾을 수 없습니다</h1>
          <Link href="/">
            <button className="rounded-xl bg-neonYellow px-6 py-3 font-bold text-black transition-transform hover:scale-105">
              🍌 BanaToon 시작하기
            </button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-white/10 p-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍌</span>
            <span className="text-xl font-bold text-neonYellow">BanaToon</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
        {/* Shared Image */}
        <div className="mb-6 w-full max-w-lg">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-[#CCFF00]/10">
            <Image
              src={hasError ? '/placeholder.png' : decodeURIComponent(imageUrl)}
              alt="공유된 웹툰 이미지"
              width={0}
              height={0}
              sizes="100vw"
              className="h-auto w-full"
              style={{ width: '100%', height: 'auto' }}
              onError={() => setHasError(true)}
            />
          </div>
        </div>

        {/* Info Text */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm text-gray-400">
            친구가 BanaToon으로 만든 웹툰 스타일 이미지예요!
          </p>
          <p className="text-lg font-medium text-white">나만의 웹툰도 만들어볼까요? 🎨</p>
        </div>

        {/* CTA Button */}
        <Link href="/">
          <button className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#CCFF00] to-[#a8d900] px-8 py-4 text-lg font-bold text-black shadow-lg shadow-[#CCFF00]/30 transition-all hover:scale-105 active:scale-95">
            <span className="text-2xl">🍌</span>
            나도 만들러 가기
          </button>
        </Link>

        {/* Features Preview */}
        <div className="mt-12 grid max-w-md grid-cols-3 gap-4 text-center">
          <div className="p-3">
            <div className="mb-2 text-2xl">📸</div>
            <p className="text-xs text-gray-400">사진 업로드</p>
          </div>
          <div className="p-3">
            <div className="mb-2 text-2xl">🎬</div>
            <p className="text-xs text-gray-400">AI 변환</p>
          </div>
          <div className="p-3">
            <div className="mb-2 text-2xl">✨</div>
            <p className="text-xs text-gray-400">웹툰 완성</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 p-4">
        <p className="text-center text-xs text-gray-500">
          © 2026 BanaToon. 일상의 바이브를 툰으로 담는다.
        </p>
      </footer>
    </main>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
          <Spin size="large" />
        </main>
      }
    >
      <ShareContent />
    </Suspense>
  );
}
