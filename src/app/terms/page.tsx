'use client';

import Link from 'next/link';

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                        ← 홈
                    </Link>
                    <h1 className="text-2xl font-bold text-white">
                        이용<span className="text-[#CCFF00]">약관</span>
                    </h1>
                </div>

                {/* Content */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-8 text-gray-300">
                    <section>
                        <p className="text-gray-400 text-sm mb-6">
                            최종 수정일: 2026년 1월 18일
                        </p>
                        <p className="leading-relaxed">
                            본 이용약관(이하 "약관")은 ToonSnap(이하 "서비스")의 이용과 관련하여
                            서비스 제공자와 이용자 간의 권리, 의무 및 책임사항을 규정합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">제1조 (목적)</h2>
                        <p className="leading-relaxed">
                            이 약관은 ToonSnap이 제공하는 AI 기반 이미지 변환 서비스의 이용조건 및 절차,
                            이용자와 서비스 제공자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">제2조 (용어의 정의)</h2>
                        <ul className="list-disc list-inside space-y-2 text-gray-400">
                            <li><strong className="text-gray-300">"서비스":</strong> ToonSnap이 제공하는 AI 이미지 변환 및 관련 기능 일체</li>
                            <li><strong className="text-gray-300">"이용자":</strong> 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 자</li>
                            <li><strong className="text-gray-300">"콘텐츠":</strong> 이용자가 업로드하거나 서비스를 통해 생성한 이미지, 영상 등</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">제3조 (서비스의 제공)</h2>
                        <p className="leading-relaxed mb-4">서비스는 다음과 같은 기능을 제공합니다:</p>
                        <ul className="list-disc list-inside space-y-2 text-gray-400">
                            <li>사진 및 영상을 K-웹툰 스타일로 변환하는 AI 기능</li>
                            <li>변환된 이미지를 저장하고 관리하는 갤러리 기능</li>
                            <li>변환된 결과물을 SNS에 공유하는 기능</li>
                            <li>기타 서비스가 정하는 부가 기능</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">제4조 (서비스 이용)</h2>
                        <p className="leading-relaxed mb-4">
                            서비스는 별도의 회원가입 없이 이용할 수 있으며, 이용자는 다음 사항을 준수해야 합니다:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-400">
                            <li>타인의 저작권, 초상권 등 권리를 침해하는 콘텐츠를 업로드하지 않을 것</li>
                            <li>불법적이거나 유해한 콘텐츠를 업로드하지 않을 것</li>
                            <li>서비스의 정상적인 운영을 방해하지 않을 것</li>
                            <li>서비스를 상업적 목적으로 무단 이용하지 않을 것</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">제5조 (콘텐츠의 권리)</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-white mb-2">1. 원본 콘텐츠</h3>
                                <p className="text-gray-400">
                                    이용자가 업로드하는 원본 이미지 및 영상의 저작권은 원래 권리자에게 있습니다.
                                    이용자는 해당 콘텐츠에 대한 적법한 권리를 보유하고 있어야 합니다.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-white mb-2">2. 변환 결과물</h3>
                                <p className="text-gray-400">
                                    서비스를 통해 생성된 변환 결과물은 이용자가 개인적, 비상업적 용도로 자유롭게 사용할 수 있습니다.
                                    단, 상업적 이용 시에는 별도의 라이선스가 필요할 수 있습니다.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-white mb-2">3. AI 학습</h3>
                                <p className="text-gray-400">
                                    서비스는 이용자가 업로드한 콘텐츠를 AI 모델 학습에 사용하지 않습니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">제6조 (면책조항)</h2>
                        <ul className="list-disc list-inside space-y-2 text-gray-400">
                            <li>서비스는 AI 기술의 특성상 변환 결과의 품질을 보장하지 않습니다.</li>
                            <li>서비스 장애, 데이터 손실 등으로 인한 손해에 대해 책임지지 않습니다.</li>
                            <li>이용자의 불법적인 서비스 이용으로 인한 문제는 이용자 본인의 책임입니다.</li>
                            <li>제3자의 콘텐츠(광고 포함)는 해당 제공자의 책임하에 제공됩니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">제7조 (서비스의 변경 및 중단)</h2>
                        <p className="leading-relaxed">
                            서비스는 운영상, 기술상의 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.
                            이 경우 가능한 범위 내에서 사전에 공지합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">제8조 (분쟁 해결)</h2>
                        <p className="leading-relaxed">
                            서비스 이용과 관련하여 분쟁이 발생한 경우, 양 당사자는 원만한 해결을 위해 성실히 협의합니다.
                            협의가 이루어지지 않는 경우, 대한민국 법률에 따라 관할 법원에서 해결합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">제9조 (약관의 변경)</h2>
                        <p className="leading-relaxed">
                            본 약관은 관련 법령 및 서비스 정책 변경에 따라 수정될 수 있습니다.
                            변경된 약관은 서비스 내 공지를 통해 효력이 발생합니다.
                        </p>
                    </section>

                    <div className="pt-6 border-t border-white/10">
                        <p className="text-gray-500 text-sm">
                            본 약관에 동의하지 않으시는 경우, 서비스 이용을 중단해 주시기 바랍니다.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
