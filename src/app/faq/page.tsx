import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '기술 FAQ (Technical FAQ)',
  description: 'BanaToon의 기술 스택과 아키텍처에 대한 상세한 질문과 답변입니다.',
};

export default function FAQPage() {
  const faqList = [
    {
      q: 'BanaToon의 서버 아키텍처는 어떻게 구성되어 있나요?',
      a: 'BanaToon은 Cloudflare Workers를 기반으로 한 100% 서버리스(Serverless) 아키텍처로 구동됩니다. 전통적인 서버(EC2 등) 없이 전 세계 300개 이상의 엣지 로케이션에 배포된 코드가 사용자의 요청을 가장 가까운 위치에서 처리합니다. 이를 통해 인프라 관리 부담을 없애고, 트래픽 폭주 시에도 자동으로 무한 확장이 가능합니다.',
    },
    {
      q: '이미지 분석에 사용되는 AI 모델은 무엇인가요?',
      a: '이미지의 맥락과 내용을 정확히 파악하기 위해 Google의 멀티모달 AI인 "Gemini Pro Vision"을 활용합니다. 단순히 픽셀을 변환하는 것이 아니라, Gemini가 사진 속 인물의 표정, 행동, 상황을 텍스트로 이해(Captioning)한 후, 이를 기반으로 최적화된 웹툰 스타일 생성 프롬프트를 작성합니다.',
    },
    {
      q: '사용자가 업로드한 이미지는 안전하게 보관되나요?',
      a: '네, 보안과 프라이버시가 최우선입니다. 업로드된 이미지는 Cloudflare R2 객체 스토리지(Object Storage)에 암호화되어 저장됩니다. R2는 AWS S3와 호환되면서도 불필요한 데이터 유출을 막기 위해 엄격한 접근 제어 정책(IAM)을 적용하고 있습니다.',
    },
    {
      q: '업로드한 데이터는 언제 삭제되나요?',
      a: 'BanaToon은 "Ephemeral Storage Policy(임시 저장 정책)"를 따릅니다. 변환이 완료되고 사용자가 결과물을 다운로드하거나 갤러리에 저장한 후, 원본 및 임시 데이터는 Cloudflare R2 수명 주기 정책(Lifecycle Policy)에 의해 24시간 이내에 물리적으로 영구 삭제됩니다.',
    },
    {
      q: '데이터베이스는 어떤 기술을 사용하나요?',
      a: '글로벌 엣지 네트워크와 완벽하게 통합된 Cloudflare D1(SQLite 기반의 엣지 SQL DB)을 사용합니다. 사용자의 메타데이터나 세션 정보는 특정 리전이 아닌 전 세계 엣지 노드에 복제되어 저장되므로, 어느 국가에서 접속하더라도 지연 시간(Latency) 없는 빠른 데이터 조회가 가능합니다.',
    },
    {
      q: '대용량 이미지 처리 시 속도 저하는 없나요?',
      a: 'Cloudflare Workers의 엣지 컴퓨팅 능력을 활용하여 이미지 리사이징과 포맷 최적화(WebP 변환)를 클라이언트와 가장 가까운 엣지 서버에서 수행합니다. 이로 인해 원본 서버로의 데이터 전송량을 최소화하고, 네트워크 병목 현상을 획기적으로 줄였습니다.',
    },
    {
      q: '왜 AWS나 Azure가 아닌 Cloudflare 생태계를 선택했나요?',
      a: '가장 큰 이유는 "Egress Fee(데이터 전송 비용) 0원" 정책과 "Cold Start 없는 엣지 컴퓨팅" 때문입니다. 이미지/비디오 서비스 특성상 대역폭 비용이 큰데, Cloudflare R2를 통해 이를 절감하여 사용자에게 무료 서비스를 지속 제공할 수 있습니다. 또한, Workers의 0ms 콜드 스타트는 사용자 경험을 극대화합니다.',
    },
    {
      q: '비디오 웹툰 변환은 어떤 원리로 작동하나요?',
      a: '비디오 처리는 프레임 추출 -> Gemini 분석 -> 스타일 변환의 파이프라인을 거칩니다. 클라이언트 브라우저(WebAssembly) 또는 엣지 워커에서 주요 키프레임을 추출하고, 이를 병렬로 처리하여 영상을 연속된 웹툰 컷으로 재구성합니다. 이 과정에서 시간적 일관성(Temporal Consistency)을 유지하는 알고리즘이 적용됩니다.',
    },
    {
      q: '글로벌 서비스 제공을 위한 네트워크 최적화 기술은?',
      a: 'Cloudflare의 Anycast Network를 통해 사용자는 지리적으로 가장 가까운 데이터 센터로 자동 연결됩니다. 또한, 정적 자산(JS, CSS, 이미지)은 전 세계 CDN에 캐싱되어 있으며, 동적 API 요청은 Workers를 통해 최단 경로로 라우팅됩니다.',
    },
    {
      q: 'AI 생성 결과물의 일관성은 어떻게 유지하나요?',
      a: '동일한 캐릭터나 스타일을 유지하기 위해 Seed 고정 및 ControlNet 기술을 활용합니다. Gemini가 분석한 초기 캐릭터의 특징(Feature Map)을 유지하면서 스타일만 변경하도록 파이프라인을 설계하여, 여러 장의 사진을 변환해도 동일 인물임을 알아볼 수 있습니다.',
    },
    {
      q: 'API 호출 한도나 속도 제한이 있나요?',
      a: '현재 Cloudflare Workers의 분당 요청 제한(Rate Limiting)과 Gemini API의 쿼터에 맞춰 동적 조절 알고리즘이 적용되어 있습니다. 트래픽이 급증할 경우 대기열 시스템(Queue)이 작동하여 서버 과부하를 방지하고 안정적인 처리를 보장합니다.',
    },
    {
      q: '향후 추가될 기술적 기능은 무엇인가요?',
      a: '차세대 Gemini 1.5 Pro 모델 도입을 통해 긴 영상의 롱 컨텍스트(Long Context) 분석을 준비 중입니다. 이를 통해 단순한 컷 변환이 아닌, 영상 전체의 스토리라인을 이해하고 이에 맞는 말풍선과 효과음을 자동으로 생성하는 기능을 개발하고 있습니다.',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 text-gray-200 md:py-20">
      <h1 className="mb-8 text-3xl font-bold text-white md:text-4xl">Technical FAQ</h1>
      <p className="mb-12 text-lg text-gray-400">
        BanaToon의 기술적 배경과 아키텍처에 대한 심층적인 답변을 확인하세요.
        <br className="hidden md:block" />
        Cloudflare Workers, R2, D1 및 Google Gemini 기술이 어떻게 적용되었는지 설명합니다.
      </p>

      <div className="space-y-10">
        {faqList.map((item, idx) => (
          <div key={idx} className="border-b border-white/10 pb-8 last:border-0">
            <h2 className="mb-4 text-xl font-semibold text-neonYellow">Q. {item.q}</h2>
            <p className="whitespace-pre-wrap leading-relaxed text-gray-300">{item.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl bg-white/5 p-6 text-center">
        <p className="text-gray-400">
          더 깊이 있는 기술적 논의가 필요하신가요? <br />
          <a href="/contact" className="text-neonYellow hover:underline">
            개발팀에 문의하기
          </a>{' '}
          를 통해 연락해 주세요.
        </p>
      </div>
    </div>
  );
}
