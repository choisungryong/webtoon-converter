'use client';

import Link from 'next/link';
import { MailOutlined, QuestionCircleOutlined, CommentOutlined } from '@ant-design/icons';

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                        ← 홈
                    </Link>
                    <h1 className="text-2xl font-bold text-white">
                        문의<span className="text-[#CCFF00]">하기</span>
                    </h1>
                </div>

                {/* Hero */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-3">
                        무엇이든 물어보세요!
                    </h2>
                    <p className="text-gray-400 max-w-xl mx-auto">
                        ToonSnap 서비스 이용 중 궁금한 점이나 문제가 있으시면
                        아래 방법으로 연락해 주세요. 빠르게 답변드리겠습니다.
                    </p>
                </div>

                {/* Contact Methods */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#CCFF00]/50 transition-colors">
                        <div className="w-14 h-14 bg-[#CCFF00]/20 rounded-xl flex items-center justify-center mb-4">
                            <MailOutlined className="text-[#CCFF00] text-3xl" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">이메일 문의</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            일반 문의, 제휴 제안, 버그 신고 등 모든 문의를 받습니다.
                        </p>
                        <a
                            href="mailto:twinspa0713@gmail.com"
                            className="inline-flex items-center gap-2 text-[#CCFF00] hover:underline font-medium"
                        >
                            twinspa0713@gmail.com
                        </a>
                        <p className="text-gray-500 text-xs mt-2">
                            영업일 기준 24시간 이내 답변
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#CCFF00]/50 transition-colors">
                        <div className="w-14 h-14 bg-[#CCFF00]/20 rounded-xl flex items-center justify-center mb-4">
                            <CommentOutlined className="text-[#CCFF00] text-3xl" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">피드백 보내기</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            서비스 개선 아이디어나 사용 후기를 공유해 주세요.
                        </p>
                        <a
                            href="mailto:twinspa0713@gmail.com"
                            className="inline-flex items-center gap-2 text-[#CCFF00] hover:underline font-medium"
                        >
                            twinspa0713@gmail.com
                        </a>
                        <p className="text-gray-500 text-xs mt-2">
                            여러분의 의견이 서비스를 발전시킵니다
                        </p>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <QuestionCircleOutlined className="text-[#CCFF00] text-2xl" />
                        <h3 className="text-xl font-bold text-white">자주 묻는 질문</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="border-b border-white/10 pb-4">
                            <h4 className="text-white font-semibold mb-2">Q. 서비스 이용료가 있나요?</h4>
                            <p className="text-gray-400 text-sm">
                                A. ToonSnap의 기본 기능은 무료로 제공됩니다. 일부 프리미엄 기능은 추후 유료로 제공될 수 있습니다.
                            </p>
                        </div>

                        <div className="border-b border-white/10 pb-4">
                            <h4 className="text-white font-semibold mb-2">Q. 변환된 이미지의 저작권은 누구에게 있나요?</h4>
                            <p className="text-gray-400 text-sm">
                                A. 변환 결과물은 이용자가 개인적, 비상업적 용도로 자유롭게 사용할 수 있습니다.
                                자세한 내용은 <Link href="/terms" className="text-[#CCFF00] hover:underline">이용약관</Link>을 참조해 주세요.
                            </p>
                        </div>

                        <div className="border-b border-white/10 pb-4">
                            <h4 className="text-white font-semibold mb-2">Q. 업로드한 사진은 어떻게 처리되나요?</h4>
                            <p className="text-gray-400 text-sm">
                                A. 업로드된 사진은 오직 변환 목적으로만 사용되며, AI 모델 학습에 사용되지 않습니다.
                                자세한 내용은 <Link href="/privacy" className="text-[#CCFF00] hover:underline">개인정보처리방침</Link>을 참조해 주세요.
                            </p>
                        </div>

                        <div className="pb-4">
                            <h4 className="text-white font-semibold mb-2">Q. 변환 결과가 마음에 들지 않아요.</h4>
                            <p className="text-gray-400 text-sm">
                                A. AI 변환 특성상 모든 사진에서 완벽한 결과를 보장하기 어렵습니다.
                                다른 스타일을 선택하거나, 밝고 선명한 사진으로 다시 시도해 보시는 것을 권장드립니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Business Inquiry */}
                <div className="bg-gradient-to-br from-[#CCFF00]/10 to-transparent border border-[#CCFF00]/30 rounded-2xl p-6 md:p-8">
                    <h3 className="text-xl font-bold text-white mb-3">비즈니스 및 제휴 문의</h3>
                    <p className="text-gray-400 mb-4">
                        기업 제휴, 광고, 미디어 관련 문의는 별도의 채널로 연락해 주세요.
                    </p>
                    <a
                        href="mailto:twinspa0713@gmail.com"
                        className="inline-flex items-center gap-2 bg-[#CCFF00] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#bbe600] transition-colors"
                    >
                        <MailOutlined />
                        twinspa0713@gmail.com
                    </a>
                </div>
            </div>
        </main>
    );
}
