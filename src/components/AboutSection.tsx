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
              1. Cloudflare Workers 기반의 Serverless Architecture
            </h3>
            <p>
              BanaToon은 전통적인 서버 인프라를 벗어나, <strong>Cloudflare Workers</strong>를 활용한
              완전한 서버리스(Serverless) 아키텍처로 구축되었습니다. 이를 통해 전 세계 300여 개
              도시의 엣지(Edge) 네트워크에서 사용자의 요청을 즉각적으로 처리하며, 콜드 스타트(Cold
              Start) 없는 빠른 응답 속도를 제공합니다. 이미지 업로드와 전처리 과정은 엣지 단계에서
              수행되어 지연 시간(Latency)을 최소화했습니다.
            </p>

            <h3 className="mt-6 text-lg font-bold text-white">
              2. Google Gemini Pro Vision을 활용한 이미지 분석
            </h3>
            <p>
              단순한 스타일 변환을 넘어, <strong>Google Gemini Pro Vision</strong> 멀티모달 모델을
              도입하여 이미지의 맥락(Context)을 깊이 있게 이해합니다. Gemini는 업로드된 사진 속
              인물의 표정, 동작, 그리고 배경의 분위기를 분석하여 프롬프트를 최적화하며, 이를 통해
              웹툰 스타일로 변환 시 원작의 의도를 정확하게 반영한 결과물을 생성합니다.
            </p>

            <h3 className="mt-6 text-lg font-bold text-white">
              3. Cloudflare R2와 D1을 이용한 데이터 처리 및 보안
            </h3>
            <p>
              사용자의 미디어 데이터는 AWS S3 호환 객체 스토리지인 <strong>Cloudflare R2</strong>에
              암호화되어 저장됩니다. R2는 Egress 비용이 발생하지 않아 대용량 이미지 처리에도
              경제적이며,
              <strong>Ephemeral Storage Policy</strong>를 적용하여 변환 완료 후 데이터가 자동으로
              영구 삭제되도록 설계되었습니다. 또한, 메타데이터와 애플리케이션 상태 정보는 엣지 SQL
              데이터베이스인
              <strong>Cloudflare D1</strong>에서 분산 처리되어 데이터의 무결성과 높은 가용성을
              보장합니다.
            </p>

            <div className="mt-8 border-t border-white/10 pt-6">
              <h4 className="text-md mb-2 font-semibold text-white">Technical Stack</h4>
              <ul className="grid list-inside list-disc grid-cols-2 gap-2 text-xs text-gray-500">
                <li>Frontend: Next.js 14 (App Router)</li>
                <li>Compute: Cloudflare Workers (Edge Runtime)</li>
                <li>AI Model: Google Gemini Pro Vision</li>
                <li>Storage: Cloudflare R2 (Object Storage)</li>
                <li>Database: Cloudflare D1 (Edge SQL)</li>
                <li>Styling: Tailwind CSS, Ant Design</li>
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
