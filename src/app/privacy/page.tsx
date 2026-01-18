'use client';

import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                        ← 홈
                    </Link>
                    <h1 className="text-2xl font-bold text-white">
                        개인정보<span className="text-[#CCFF00]">처리방침</span>
                    </h1>
                </div>

                {/* Content */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-8 text-gray-300">
                    <section>
                        <p className="text-gray-400 text-sm mb-6">
                            최종 수정일: 2026년 1월 18일
                        </p>
                        <p className="leading-relaxed">
                            ToonSnap(이하 "서비스")은 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수하고 있습니다.
                            본 개인정보처리방침은 서비스 이용과 관련하여 수집되는 개인정보의 처리에 관한 사항을 안내합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">1. 수집하는 개인정보</h2>
                        <p className="leading-relaxed mb-4">
                            서비스는 원활한 서비스 제공을 위해 최소한의 정보만을 수집합니다.
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-400">
                            <li><strong className="text-gray-300">자동 수집 정보:</strong> 익명 사용자 식별자(UUID), 접속 로그, 브라우저 정보</li>
                            <li><strong className="text-gray-300">이용자 제공 정보:</strong> 업로드한 이미지 또는 영상(변환 목적으로만 사용)</li>
                            <li><strong className="text-gray-300">쿠키:</strong> 서비스 이용 편의를 위한 세션 정보</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">2. 개인정보의 이용 목적</h2>
                        <ul className="list-disc list-inside space-y-2 text-gray-400">
                            <li>AI 기반 이미지 변환 서비스 제공</li>
                            <li>갤러리 기능을 통한 변환 결과 저장 및 관리</li>
                            <li>서비스 품질 향상 및 오류 분석</li>
                            <li>맞춤형 광고 제공 (Google AdSense 등)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">3. 개인정보의 보관 및 파기</h2>
                        <p className="leading-relaxed mb-4">
                            이용자가 업로드한 이미지와 변환 결과물은 갤러리에 저장되며, 이용자가 직접 삭제하거나 계정 비활성화 시 파기됩니다.
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-400">
                            <li>변환된 이미지: 이용자 삭제 시까지 보관</li>
                            <li>서비스 로그: 최대 90일간 보관 후 자동 삭제</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">4. 제3자 제공 및 위탁</h2>
                        <p className="leading-relaxed mb-4">
                            서비스는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-400">
                            <li>이용자가 사전에 동의한 경우</li>
                            <li>법령에 의해 요구되는 경우</li>
                            <li>서비스 제공을 위해 필요한 범위 내에서 업무 위탁 (클라우드 호스팅, AI 처리 등)</li>
                        </ul>
                        <div className="mt-4 p-4 bg-white/5 rounded-lg">
                            <p className="text-sm text-gray-400">
                                <strong className="text-gray-300">위탁 업체:</strong><br />
                                • Cloudflare (호스팅, CDN)<br />
                                • Replicate (AI 이미지 처리)
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">5. 쿠키 및 광고</h2>
                        <p className="leading-relaxed mb-4">
                            서비스는 Google AdSense를 통해 광고를 게재할 수 있으며, 이 과정에서 Google이 쿠키를 사용할 수 있습니다.
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-400">
                            <li>Google의 광고 쿠키 사용에 대한 자세한 내용은 <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-[#CCFF00] hover:underline">Google 광고 정책</a>을 참조하세요.</li>
                            <li>이용자는 브라우저 설정을 통해 쿠키 사용을 거부할 수 있습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">6. 이용자의 권리</h2>
                        <p className="leading-relaxed mb-4">
                            이용자는 언제든지 자신의 개인정보에 대해 다음과 같은 권리를 행사할 수 있습니다.
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-400">
                            <li>개인정보 열람 요청</li>
                            <li>개인정보 정정 및 삭제 요청</li>
                            <li>개인정보 처리 정지 요청</li>
                        </ul>
                        <p className="mt-4 text-gray-400">
                            위 권리 행사는 <Link href="/contact" className="text-[#CCFF00] hover:underline">문의하기</Link> 페이지를 통해 요청하실 수 있습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">7. 개인정보 보호책임자</h2>
                        <div className="p-4 bg-white/5 rounded-lg">
                            <p className="text-gray-400">
                                <strong className="text-gray-300">담당:</strong> ToonSnap 운영팀<br />
                                <strong className="text-gray-300">이메일:</strong> twinspa0713@gmail.com
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">8. 개인정보처리방침의 변경</h2>
                        <p className="leading-relaxed">
                            본 개인정보처리방침은 법령 및 서비스 정책 변경에 따라 수정될 수 있습니다.
                            변경 시에는 서비스 내 공지를 통해 안내드립니다.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
