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

                {/* Q&A Board Section */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <QuestionCircleOutlined className="text-[#CCFF00] text-2xl" />
                        <h3 className="text-xl font-bold text-white">Q&A 게시판</h3>
                        <span className="text-gray-500 text-sm ml-auto">총 15개의 질문</span>
                    </div>

                    <div className="space-y-3">
                        {/* Q1 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 서비스 이용료가 있나요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. ToonSnap의 기본 기능은 <strong className="text-[#CCFF00]">완전 무료</strong>로 제공됩니다. 회원가입 없이 바로 사용할 수 있으며, 일부 프리미엄 기능은 추후 유료로 제공될 수 있습니다.
                            </div>
                        </details>

                        {/* Q2 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 변환된 이미지의 저작권은 누구에게 있나요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. 변환 결과물은 이용자가 개인적, 비상업적 용도로 자유롭게 사용할 수 있습니다. 상업적 이용 시에는 별도 라이선스가 필요할 수 있습니다. 자세한 내용은 <Link href="/terms" className="text-[#CCFF00] hover:underline">이용약관</Link>을 참조해 주세요.
                            </div>
                        </details>

                        {/* Q3 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 업로드한 사진은 어떻게 처리되나요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. 업로드된 사진은 오직 변환 목적으로만 사용되며, AI 모델 학습에 사용되지 않습니다. 자세한 내용은 <Link href="/privacy" className="text-[#CCFF00] hover:underline">개인정보처리방침</Link>을 참조해 주세요.
                            </div>
                        </details>

                        {/* Q4 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 변환 결과가 마음에 들지 않아요.</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. AI 변환 특성상 모든 사진에서 완벽한 결과를 보장하기 어렵습니다. 다른 스타일을 선택하거나, 밝고 선명한 사진으로 다시 시도해 보시는 것을 권장드립니다.
                            </div>
                        </details>

                        {/* Q5 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 한 번에 몇 장까지 변환할 수 있나요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. 현재 한 번에 최대 <strong className="text-[#CCFF00]">5장</strong>까지 동시에 변환할 수 있습니다. 영상 모드에서도 최대 5개의 장면을 선택할 수 있습니다.
                            </div>
                        </details>

                        {/* Q6 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 지원하는 이미지 형식은 무엇인가요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. JPG, PNG, WEBP 등 대부분의 이미지 형식을 지원합니다. 영상의 경우 MP4, MOV, WebM 형식을 지원합니다.
                            </div>
                        </details>

                        {/* Q7 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 영상 용량 제한이 있나요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. 네, 영상 파일은 최대 <strong className="text-[#CCFF00]">50MB</strong>까지 업로드할 수 있습니다. 용량이 큰 경우 영상 편집 앱으로 압축 후 업로드해 주세요.
                            </div>
                        </details>

                        {/* Q8 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 변환 시간은 얼마나 걸리나요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. 평균적으로 이미지 1장당 약 10~30초 정도 소요됩니다. 서버 상태와 이미지 복잡도에 따라 다소 차이가 있을 수 있습니다.
                            </div>
                        </details>

                        {/* Q9 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 갤러리에 저장된 이미지는 얼마나 보관되나요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. 갤러리에 저장된 이미지는 직접 삭제하기 전까지 보관됩니다. 중요한 이미지는 다운로드 기능을 이용해 별도로 저장해 두시는 것을 권장합니다.
                            </div>
                        </details>

                        {/* Q10 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 스타일 종류는 몇 가지인가요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. 현재 로맨스, 액션, 일상 등 다양한 K-웹툰 스타일을 제공하고 있으며, 지속적으로 새로운 스타일을 추가할 예정입니다.
                            </div>
                        </details>

                        {/* Q11 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 말풍선 추가 기능은 어떻게 사용하나요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. 변환 결과 이미지에서 "💬 말풍선 추가" 버튼을 클릭하면 텍스트를 입력하고 위치를 조절할 수 있는 에디터가 열립니다. 완성 후 저장하면 갤러리에 반영됩니다.
                            </div>
                        </details>

                        {/* Q12 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 마이웹툰 기능은 무엇인가요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. 갤러리에서 여러 이미지를 선택한 후 "웹툰 보기"를 누르면 이미지들이 세로로 이어붙여집니다. 이렇게 만든 웹툰은 "마이웹툰" 탭에서 확인할 수 있습니다.
                            </div>
                        </details>

                        {/* Q13 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 모바일에서도 사용할 수 있나요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. 네! ToonSnap은 모바일 최적화되어 있어 스마트폰 브라우저에서도 편리하게 사용할 수 있습니다. 별도의 앱 설치가 필요 없습니다.
                            </div>
                        </details>

                        {/* Q14 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 변환된 이미지를 SNS에 공유할 수 있나요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. 네, 갤러리에서 이미지를 클릭하면 다운로드 버튼과 함께 카카오톡, 인스타그램 등 SNS 공유 버튼이 제공됩니다.
                            </div>
                        </details>

                        {/* Q15 */}
                        <details className="group bg-white/5 rounded-lg">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 rounded-lg transition-colors">
                                <span className="text-white font-medium">Q. 버그를 발견했어요. 어디에 신고하나요?</span>
                                <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="px-4 pb-4 text-gray-400 text-sm">
                                A. 위의 이메일 주소로 버그 내용과 스크린샷을 보내주시면 빠르게 확인 후 수정하겠습니다. 여러분의 피드백이 서비스를 발전시킵니다!
                            </div>
                        </details>
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
