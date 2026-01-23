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

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-400 transition-colors hover:text-white"
          >
            ← 홈
          </Link>
          <h1 className="text-2xl font-bold text-white">
            서비스 <span className="text-neonYellow">소개</span>
          </h1>
        </div>

        {/* Hero Section */}
        <div className="mb-8 rounded-2xl border border-[#CCFF00]/30 bg-gradient-to-br from-[#CCFF00]/20 to-transparent p-8 text-center md:p-12">
          <h2 className="mb-4 text-4xl font-black text-white md:text-5xl">
            <span className="text-[#FFD700]">Bana</span>Toon
          </h2>
          <p className="mb-6 text-xl text-gray-300">
            일상의 바이브를 <strong className="text-neonYellow">툰으로</strong>{' '}
            담는다
          </p>
          <p className="mx-auto max-w-2xl leading-relaxed text-gray-400">
            BanaToon은 AI 기술을 활용하여 일반 사진이나 영상을 한국 웹툰 특유의
            감성적인 스타일로 변환해주는 서비스입니다.
          </p>
        </div>

        {/* Features - 6 cards for even grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#CCFF00]/20">
              <ThunderboltFilled className="text-2xl text-neonYellow" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">
              ⚡ 빠른 AI 변환
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              최신 AI 기술로 단 몇 초 만에 사진을 웹툰 스타일로 변환합니다.
              복잡한 설정 없이 사진을 업로드하면 바로 결과 확인!
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#CCFF00]/20">
              <PictureFilled className="text-2xl text-neonYellow" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">
              🎨 다양한 스타일
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              로맨스, 액션, 일상 등 다양한 웹툰 장르 스타일을 선택할 수
              있습니다. 각 장르의 특성을 살린 개성 있는 결과물!
            </p>
          </div>

          <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-blue-500/10 p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-purple-500/30">
              <StarFilled className="text-2xl text-purple-400" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">
              ✨ 스마트 레이아웃
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              AI가 이미지 구도와 중요도를 분석해{' '}
              <strong className="text-purple-300">
                패널 레이아웃을 자동 최적화
              </strong>
              . 반반 분할, 전체 컷, 오버레이 등 프로 수준의 연출!
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-yellow-500/30">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">
              💬 AI 말풍선 추천
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              이미지에 맞는{' '}
              <strong className="text-yellow-300">대사를 AI가 자동 추천</strong>
              . 클릭 한 번으로 말풍선 추가, 일반/속마음/외침 스타일 지원!
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-500/30">
              <ShareAltOutlined className="text-2xl text-blue-400" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">
              📤 저장 & 공유
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              변환한 이미지는 갤러리에 자동 저장.{' '}
              <strong className="text-blue-300">
                인스타 스토리·카카오톡 공유
              </strong>
              한 번의 클릭으로 친구들과 바로 공유하세요!
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#CCFF00]/20">
              <SmileFilled className="text-2xl text-neonYellow" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">
              😊 누구나 쉽게
            </h3>
            <p className="text-sm leading-relaxed text-gray-400">
              회원가입 없이 바로 사용 가능. 사진 드래그 → 스타일 선택 → 변환!
              3단계로 끝!
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h3 className="mb-6 text-center text-xl font-bold text-white">
            이용 방법
          </h3>
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex-1 text-center">
              <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-neonYellow text-2xl font-bold text-black">
                1
              </div>
              <p className="mb-1 font-semibold text-white">사진 업로드</p>
              <p className="text-sm text-gray-400">변환할 사진 선택</p>
            </div>
            <div className="hidden text-2xl text-gray-600 md:block">→</div>
            <div className="flex-1 text-center">
              <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-neonYellow text-2xl font-bold text-black">
                2
              </div>
              <p className="mb-1 font-semibold text-white">스타일 선택</p>
              <p className="text-sm text-gray-400">원하는 웹툰 스타일 선택</p>
            </div>
            <div className="hidden text-2xl text-gray-600 md:block">→</div>
            <div className="flex-1 text-center">
              <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-neonYellow text-2xl font-bold text-black">
                3
              </div>
              <p className="mb-1 font-semibold text-white">변환 완료</p>
              <p className="text-sm text-gray-400">결과 저장 및 공유</p>
            </div>
          </div>
        </div>

        {/* Mission */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h3 className="mb-4 text-xl font-bold text-white">우리의 미션</h3>
          <p className="mb-4 leading-relaxed text-gray-300">
            BanaToon은 누구나 쉽게 자신만의 웹툰 콘텐츠를 만들 수 있도록 돕는
            것을 목표로 합니다. 복잡한 그래픽 도구나 전문적인 기술 없이도, AI의
            힘을 빌려 일상의 순간들을 예술적인 작품으로 변환할 수 있습니다.
          </p>
          <p className="leading-relaxed text-gray-400">
            K-웹툰의 독특한 감성을 전 세계와 공유하고, 더 많은 사람들이 창작의
            즐거움을 느낄 수 있기를 바랍니다.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block rounded-xl bg-neonYellow px-8 py-4 text-lg font-bold text-black transition-colors hover:bg-[#bbe600]"
          >
            지금 바로 시작하기 →
          </Link>
        </div>
      </div>
    </main>
  );
}
