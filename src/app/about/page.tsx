'use client';

import Link from 'next/link';
import { CheckCircleFilled, ThunderboltFilled, SmileFilled, PictureFilled, StarFilled, ShareAltOutlined } from '@ant-design/icons';

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                        ← 홈
                    </Link>
                    <h1 className="text-2xl font-bold text-white">
                        서비스 <span className="text-[#CCFF00]">소개</span>
                    </h1>
                </div>

                {/* Hero Section */}
                <div className="bg-gradient-to-br from-[#CCFF00]/20 to-transparent border border-[#CCFF00]/30 rounded-2xl p-8 md:p-12 mb-8 text-center">
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                        Toon<span className="text-[#CCFF00]">Snap</span>
                    </h2>
                    <p className="text-xl text-gray-300 mb-6">
                        당신의 일상을 <strong className="text-[#CCFF00]">K-웹툰</strong>으로 바꿔드립니다
                    </p>
                    <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        ToonSnap은 AI 기술을 활용하여 일반 사진이나 영상을
                        한국 웹툰 특유의 감성적인 스타일로 변환해주는 서비스입니다.
                    </p>
                </div>

                {/* Features - 6 cards for even grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <div className="w-12 h-12 bg-[#CCFF00]/20 rounded-xl flex items-center justify-center mb-4">
                            <ThunderboltFilled className="text-[#CCFF00] text-2xl" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">⚡ 빠른 AI 변환</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            최신 AI 기술로 단 몇 초 만에 사진을 웹툰 스타일로 변환합니다.
                            복잡한 설정 없이 사진을 업로드하면 바로 결과 확인!
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <div className="w-12 h-12 bg-[#CCFF00]/20 rounded-xl flex items-center justify-center mb-4">
                            <PictureFilled className="text-[#CCFF00] text-2xl" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">🎨 다양한 스타일</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            로맨스, 액션, 일상 등 다양한 웹툰 장르 스타일을 선택할 수 있습니다.
                            각 장르의 특성을 살린 개성 있는 결과물!
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/10 border border-purple-500/30 rounded-2xl p-6">
                        <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center mb-4">
                            <StarFilled className="text-purple-400 text-2xl" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">✨ 스마트 레이아웃</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            AI가 이미지 구도와 중요도를 분석해 <strong className="text-purple-300">패널 레이아웃을 자동 최적화</strong>.
                            반반 분할, 전체 컷, 오버레이 등 프로 수준의 연출!
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6">
                        <div className="w-12 h-12 bg-yellow-500/30 rounded-xl flex items-center justify-center mb-4">
                            <span className="text-2xl">💬</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">💬 AI 말풍선 추천</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            이미지에 맞는 <strong className="text-yellow-300">대사를 AI가 자동 추천</strong>.
                            클릭 한 번으로 말풍선 추가, 일반/속마음/외침 스타일 지원!
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-6">
                        <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center mb-4">
                            <ShareAltOutlined className="text-blue-400 text-2xl" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">📤 저장 & 공유</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            변환한 이미지는 갤러리에 자동 저장. <strong className="text-blue-300">인스타 스토리·카카오톡 공유</strong>
                            한 번의 클릭으로 친구들과 바로 공유하세요!
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <div className="w-12 h-12 bg-[#CCFF00]/20 rounded-xl flex items-center justify-center mb-4">
                            <SmileFilled className="text-[#CCFF00] text-2xl" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">😊 누구나 쉽게</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            회원가입 없이 바로 사용 가능.
                            사진 드래그 → 스타일 선택 → 변환! 3단계로 끝!
                        </p>
                    </div>
                </div>

                {/* How it works */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-8">
                    <h3 className="text-xl font-bold text-white mb-6 text-center">이용 방법</h3>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center flex-1">
                            <div className="w-16 h-16 bg-[#CCFF00] rounded-full flex items-center justify-center text-black text-2xl font-bold mx-auto mb-3">
                                1
                            </div>
                            <p className="text-white font-semibold mb-1">사진 업로드</p>
                            <p className="text-gray-400 text-sm">변환할 사진 선택</p>
                        </div>
                        <div className="hidden md:block text-gray-600 text-2xl">→</div>
                        <div className="text-center flex-1">
                            <div className="w-16 h-16 bg-[#CCFF00] rounded-full flex items-center justify-center text-black text-2xl font-bold mx-auto mb-3">
                                2
                            </div>
                            <p className="text-white font-semibold mb-1">스타일 선택</p>
                            <p className="text-gray-400 text-sm">원하는 웹툰 스타일 선택</p>
                        </div>
                        <div className="hidden md:block text-gray-600 text-2xl">→</div>
                        <div className="text-center flex-1">
                            <div className="w-16 h-16 bg-[#CCFF00] rounded-full flex items-center justify-center text-black text-2xl font-bold mx-auto mb-3">
                                3
                            </div>
                            <p className="text-white font-semibold mb-1">변환 완료</p>
                            <p className="text-gray-400 text-sm">결과 저장 및 공유</p>
                        </div>
                    </div>
                </div>

                {/* Mission */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                    <h3 className="text-xl font-bold text-white mb-4">우리의 미션</h3>
                    <p className="text-gray-300 leading-relaxed mb-4">
                        ToonSnap은 누구나 쉽게 자신만의 웹툰 콘텐츠를 만들 수 있도록 돕는 것을 목표로 합니다.
                        복잡한 그래픽 도구나 전문적인 기술 없이도, AI의 힘을 빌려
                        일상의 순간들을 예술적인 작품으로 변환할 수 있습니다.
                    </p>
                    <p className="text-gray-400 leading-relaxed">
                        K-웹툰의 독특한 감성을 전 세계와 공유하고,
                        더 많은 사람들이 창작의 즐거움을 느낄 수 있기를 바랍니다.
                    </p>
                </div>

                {/* CTA */}
                <div className="text-center mt-8">
                    <Link
                        href="/"
                        className="inline-block bg-[#CCFF00] text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#bbe600] transition-colors"
                    >
                        지금 바로 시작하기 →
                    </Link>
                </div>
            </div>
        </main>
    );
}
