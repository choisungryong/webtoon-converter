'use client';

import { useState } from 'react';
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import GlassCard from './GlassCard';

export default function TechnicalGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-4 w-full">
      <GlassCard padding="lg" className="border-t-4 border-t-neonYellow">
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-2xl font-bold text-white">Technical Guide</h2>
          <p className="text-sm text-gray-400">BanaToon의 기술적 작동 원리와 자주 묻는 질문</p>
        </div>

        <div
          className={`relative overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[5000px]' : 'max-h-[200px]'}`}
        >
          <div className="space-y-8 text-justify text-sm leading-relaxed text-gray-300">
            {/* 1. How It Works (Technical Deep Dive) */}
            <div>
              <h3 className="mb-3 text-lg font-bold text-white">🛠️ How It Works: Under the Hood</h3>
              <p className="mb-4">
                BanaToon이 사용자의 사진과 영상을 웹툰으로 변환하는 과정은 단순한 필터 적용이 아닌,
                <strong>고도화된 AI 파이프라인</strong>을 거쳐 이루어집니다. 사용자가 업로드한
                미디어는 브라우저 내에서 1차 최적화(Compression & Resizing)를 거쳐 빠르게 전송
                가능한 형태로 변환됩니다.
              </p>
              <p className="mb-4">
                영상 처리의 경우, HTML5 Canvas API를 활용하여 클라이언트 사이드에서 주요
                장면(Keyframes)을 실시간으로 분석하고 추출합니다. 이 과정에서 이미지 간의 유사도를
                픽셀 단위로 비교하는 알고리즘이 작동하여, 중복된 프레임을 제외하고 스토리텔링에 가장
                적합한 장면만을 선별합니다.
              </p>
              <p>
                선별된 이미지는 안전한 암호화 채널을 통해 엣지 서버로 전송되며, Google의 최신
                멀티모달 AI인 Gemini Pro Vision이 이미지의 시각적 요소를 텍스트 프롬프트로
                역설계(Reverse Engineering)합니다. 이 프롬프트는 다시 이미지 생성 모델의 입력값으로
                사용되어, 원본의 구도와 감정을 유지하면서도 완벽한 웹툰 스타일로 재탄생하게 됩니다.
              </p>
            </div>

            {/* 2. Architecture & Tech Stack */}
            <div>
              <h3 className="mb-3 text-lg font-bold text-white">
                🏗️ Serverless Architecture & Tech Stack
              </h3>
              <p className="mb-4">
                BanaToon은 확장성과 성능을 극대화하기 위해{' '}
                <strong>100% Serverless Architecture</strong>로 설계되었습니다. 전통적인
                모놀리식(Monolithic) 서버 대신, 전 세계 300여 개 도시에 분산된 Cloudflare의 엣지
                네트워크를 활용하여 사용자에게 가장 가까운 서버에서 요청을 처리합니다.
              </p>

              <div className="mb-4 space-y-4 rounded-xl bg-white/5 p-4">
                <div>
                  <h4 className="font-bold text-neonYellow">Cloudflare Workers (Edge Computing)</h4>
                  <p className="mt-1 text-xs text-gray-400">
                    전통적인 서버의 Cold Start 문제 없이 0ms에 가까운 기동 속도를 자랑합니다. 모든
                    API 요청은 V8 엔진 기반의 경량화된 아이솔레이트(Isolate) 환경에서 처리되어, 수만
                    명의 동시 접속자가 발생해도 안정적인 성능을 유지합니다.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-neonYellow">
                    Google Gemini Pro Vision (Multimodal AI)
                  </h4>
                  <p className="mt-1 text-xs text-gray-400">
                    단순한 사물 인식을 넘어 이미지의 &apos;맥락&apos;을 이해하는 AI입니다. 사진 속
                    인물의 미묘한 표정 변화, 조명의 분위기, 배경의 서사적 의미까지 파악하여 단순
                    변환이 아닌 &apos;재창조&apos; 수준의 결과물을 만들어냅니다.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-neonYellow">Cloudflare D1 (Edge SQL Database)</h4>
                  <p className="mt-1 text-xs text-gray-400">
                    분산형 SQL 데이터베이스인 D1을 사용하여 데이터의 무결성을 보장합니다. 전 세계
                    어디서 접속하든 데이터 동기화 지연 없이 실시간으로 갤러리 정보를 불러올 수
                    있으며, 자동화된 백업과 복구 시스템을 갖추고 있습니다.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-neonYellow">Cloudflare R2 (Object Storage)</h4>
                  <p className="mt-1 text-xs text-gray-400">
                    AWS S3와 호환되는 객체 스토리지로, 업로드된 원본 이미지와 변환된 결과물을
                    저장합니다. 데이터 전송 비용(Egress Fee)이 0원인 이점을 활용하여 고해상도
                    이미지를 제한 없이 처리할 수 있으며, 보안을 위해 일정 시간이 지나면 데이터가
                    자동 소멸되도록 Lifecycle 정책이 적용되어 있습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. FAQ */}
            <div>
              <h3 className="mb-3 text-lg font-bold text-white">
                ❓ Frequently Asked Questions (FAQ)
              </h3>
              <div className="divide-y divide-white/10">
                <div className="py-3">
                  <h4 className="mb-2 font-semibold text-white">Q. 서비스 이용료는 무료인가요?</h4>
                  <p className="text-gray-400">
                    네, BanaToon의 기본 기능은 현재 <strong>완전 무료</strong>로 제공되고 있습니다.
                    AI 모델 사용에 따른 높은 비용에도 불구하고, 더 많은 분들이 웹툰 창작의 즐거움을
                    느끼실 수 있도록 광고 수익 모델을 통해 무료 서비스를 유지하고 있습니다.
                  </p>
                </div>
                <div className="py-3">
                  <h4 className="mb-2 font-semibold text-white">Q. 업로드한 사진은 안전한가요?</h4>
                  <p className="text-gray-400">
                    절대적으로 안전합니다. 업로드된 이미지는 변환 작업을 위해서만 일시적으로
                    사용되며,
                    <strong>Cloudflare R2의 Ephemeral Policy</strong>에 의해 처리 완료 후 일정
                    시간이 지나면 서버에서 영구적으로 삭제됩니다. 우리는 사용자의 데이터를 AI
                    학습용으로 사용하지 않습니다.
                  </p>
                </div>
                <div className="py-3">
                  <h4 className="mb-2 font-semibold text-white">
                    Q. 결과물의 저작권은 누구에게 있나요?
                  </h4>
                  <p className="text-gray-400">
                    변환된 이미지의 저작권은 기본적으로 사용자에게 귀속됩니다. 다만, AI가 생성한
                    이미지의 법적 저작권 인정 여부는 국가별 법률에 따라 다를 수 있습니다. BanaToon은
                    생성된 이미지에 대해 어떠한 권리도 주장하지 않으므로, 개인적인 용도나 SNS 공유
                    등 자유롭게 활용하시면 됩니다.
                  </p>
                </div>
                <div className="py-3">
                  <h4 className="mb-2 font-semibold text-white">
                    Q. 영상 변환 시 소리가 포함되나요?
                  </h4>
                  <p className="text-gray-400">
                    현재 버전에서는 영상의 &apos;시각적 요소&apos;만을 분석하여 정지된 웹툰 컷으로
                    변환합니다. 따라서 소리는 포함되지 않으며, 영상 속 가장 극적인 순간들을 포착하여
                    스토리가 있는 이미지 컷으로 재구성해 드립니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Gradient Overlay for collapsed state */}
          {!isExpanded && (
            <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-[var(--bg-card)] via-[var(--bg-card)] to-transparent" />
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2 text-sm font-medium text-white transition-all hover:border-neonYellow/50 hover:bg-white/10"
          >
            {isExpanded ? (
              <>
                <CaretUpOutlined /> 접기
              </>
            ) : (
              <>
                <CaretDownOutlined /> 기술 정보 & FAQ 더보기
              </>
            )}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
