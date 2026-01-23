'use client';

import { useState } from 'react';
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import GlassCard from './GlassCard';

export default function AboutSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mx-auto mb-24 mt-12 w-full max-w-4xl px-4">
      <GlassCard padding="lg" className="border-t-4 border-t-neonYellow">
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-2xl font-bold text-white">About BanaToon</h2>
          <p className="text-sm text-gray-400">
            AI 기술로 일상을 웹툰으로 재창조하는 차세대 이미지 변환 플랫폼
          </p>
        </div>

        <div
          className={`relative overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[3000px]' : 'max-h-[200px]'}`}
        >
          <div className="space-y-4 text-justify text-sm leading-relaxed text-gray-300">
            <h3 className="mt-4 text-lg font-bold text-white">
              1. 혁신적인 AI 이미지 처리 기술 (Advanced AI Image Processing)
            </h3>
            <p>
              BanaToon은 최첨단 생성형 AI(Generative AI) 기술을 기반으로 사용자의 사진과 영상을
              고품질의 한국형 웹툰 스타일로 변환하는 서비스입니다. 우리의 핵심 엔진은 Stable
              Diffusion 기반의 파인튜닝된 모델을 활용하며, 특히 인물 중심의 이미지에서 이목구비와
              표정을 정확하게 인식하고 만화적인 터치로 재해석하는 데 특화되어 있습니다. 단순히
              필터를 씌우는 수준을 넘어, 이미지의 구조적 특징(Semantic Structure)을 분석하여
              선화(Line Art)와 채색(Coloring)을 분리 처리함으로써 작가가 직접 그린 듯한 자연스러운
              결과물을 제공합니다.
            </p>
            <p>
              특히, BanaToon의 독자적인 &apos;Style Transfer Pipeline&apos;은 입력 이미지의 조명,
              텍스처, 색감 정보를 보존하면서도 웹툰 특유의 플랫(Flat)한 채색 스타일과 역동적인 명암
              대비를 적용합니다. 이를 위해 우리는 수만 장의 고품질 웹툰 데이터셋을 구축하여 AI를
              학습시켰으며, 그 결과 일상적인 스마트폰 사진도 프로 작가의 컷처럼 변환할 수 있는
              수준에 도달했습니다. 또한, 영상 처리 시에는 프레임 간의 일관성(Temporal Consistency)을
              유지하기 위해 Optical Flow 알고리즘을 결합하여, 연속된 장면에서도 캐릭터의 외형이
              무너지지 않고 자연스럽게 이어지도록 최적화했습니다.
            </p>

            <h3 className="mt-6 text-lg font-bold text-white">
              2. Edge Runtime과 고성능 클라우드 인프라 (High-Performance Infrastructure)
            </h3>
            <p>
              BanaToon은 사용자 경험(UX)을 극대화하기 위해 최신 Vercel Edge Runtime과 AWS Lambda GPU
              인스턴스를 결합한 하이브리드 아키텍처를 채택했습니다. 이미지 업로드와 전처리 과정은
              Edge Network에서 지연 시간(Latency)을 최소화하여 즉각적으로 처리되며, 무거운 AI
              추론(Inference) 작업은 고성능 GPU 클러스터에서 병렬로 수행됩니다. 이를 통해 사용자는
              모바일 환경에서도 끊김 없는 빠른 변환 속도를 경험할 수 있습니다.
            </p>
            <p>
              또한, 우리는 이미지 처리 과정에서의 데이터 보안을 최우선으로 생각합니다. 사용자가
              업로드한 모든 미디어 파일은 암호화된 상태로 전송되며, 변환 작업이 완료된 후에는 임시
              스토리지에서 즉시 영구 삭제되는 &apos;Ephemeral Storage Policy&apos;를 적용하고
              있습니다. 이는 사용자의 프라이버시를 완벽하게 보호하기 위한 BanaToon만의 철저한 보안
              원칙입니다. 서버리스(Serverless) 아키텍처를 통해 트래픽 급증 시에도 안정적인 서비스를
              제공하며, 글로벌 CDN을 통해 전 세계 어디서든 쾌적한 접속 속도를 보장합니다.
            </p>

            <h3 className="mt-6 text-lg font-bold text-white">
              3. 저작권 정책 및 창작자 생태계 기여 (Copyright & Creative Ecosystem)
            </h3>
            <p>
              BanaToon은 AI 기술과 창작자의 권리가 공존하는 건전한 생태계를 지향합니다. 서비스
              내에서 제공되는 모든 변환 스타일은 저작권 문제가 없는 라이선스 프리(License-Free)
              데이터셋 혹은 당사가 직접 제작한 오리지널 아트워크를 기반으로 학습되었습니다. 따라서
              사용자가 BanaToon을 통해 생성한 결과물은 개인적인 용도는 물론, 비상업적인 목적의 소셜
              미디어 공유, 커뮤니티 활동 등에 자유롭게 활용할 수 있습니다. (단, 상업적 이용에
              대해서는 별도의 비즈니스 라이선스 문의가 필요합니다.)
            </p>
            <p>
              우리는 AI 기술이 창작을 대체하는 것이 아니라, 누구나 쉽고 재미있게 스토리텔링을 할 수
              있도록 돕는 도구라고 믿습니다. BanaToon의 &apos;말풍선 편집기&apos;와 &apos;스토리
              모드&apos;는 사용자가 단순한 이미지 변환을 넘어 자신만의 이야기를 웹툰 형식으로 구성할
              수 있도록 지원합니다. 앞으로도 우리는 AI 기술의 윤리적 사용 가이드라인을 준수하며,
              사용자 여러분이 안심하고 창작의 즐거움을 누릴 수 있는 플랫폼을 만들어가겠습니다.
            </p>

            <div className="mt-8 border-t border-white/10 pt-6">
              <h4 className="text-md mb-2 font-semibold text-white">기술 스택 (Tech Stack)</h4>
              <ul className="grid list-inside list-disc grid-cols-2 gap-2 text-xs text-gray-500">
                <li>Frontend: Next.js 14, React, TypeScript, Tailwind CSS</li>
                <li>AI Engine: PyTorch, Stable Diffusion XL, ControlNet</li>
                <li>Infrastructure: AWS Lambda, S3, CloudFront, Vercel Edge</li>
                <li>Database & Storage: Supabase, Redis (Caching)</li>
              </ul>
            </div>
          </div>

          {/* Gradient Overlay for collapsed state */}
          {!isExpanded && (
            <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
          )}
        </div>

        <div className="mt-4 flex justify-center">
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
                <CaretDownOutlined /> 더 알아보기 (Read More)
              </>
            )}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
