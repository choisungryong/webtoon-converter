'use client';

import { QuestionCircleOutlined } from '@ant-design/icons';

export default function FAQSection() {
  const faqList = [
    {
      q: '서비스 이용료가 있나요?',
      a: 'BanaToon의 기본 기능은 완전 무료로 제공됩니다. 사진 변환, 기본 스타일 적용 등 핵심 기능을 비용 부담 없이 자유롭게 이용하실 수 있습니다.',
    },
    {
      q: '변환된 이미지의 저작권은 누구에게 있나요?',
      a: '변환된 결과물의 저작권은 이미지를 업로드한 사용자에게 귀속됩니다. 다만, 생성된 이미지는 개인적 용도(SNS 공유, 프로필 사진 등)와 비상업적 목적으로만 자유롭게 사용하실 수 있습니다.',
    },
    {
      q: '상업적 용도로 사용해도 되나요?',
      a: '기본적으로 제공되는 무료 서비스 결과물은 상업적 이용이 제한될 수 있습니다. 광고, 굿즈 제작 등 수익 창출 목적의 사용을 원하신다면 별도의 비즈니스 문의를 부탁드립니다.',
    },
    {
      q: '업로드한 사진은 서버에 저장되나요?',
      a: '업로드된 원본 사진은 AI 변환 처리를 위한 임시 저장소에 잠시 머무른 후, 변환 작업이 완료되면 즉시 또는 일정 시간 내에 자동으로 영구 삭제됩니다. 개인정보 보호를 위해 학습 데이터로 절대 사용되지 않습니다.',
    },
    {
      q: '한 번에 몇 장까지 변환할 수 있나요?',
      a: '현재 안정적인 서비스 제공을 위해 사진 모드에서는 한 번에 최대 5장, 비디오 모드에서는 최대 10개의 프레임을 추출하여 변환할 수 있습니다.',
    },
    {
      q: '변환 속도가 느려요. 얼마나 걸리나요?',
      a: '고품질 AI 렌더링을 위해 이미지 1장당 평균 10~30초 정도 소요될 수 있습니다. 사용자가 몰리는 시간대에는 대기 시간이 조금 더 길어질 수 있으니 양해 부탁드립니다.',
    },
    {
      q: '어떤 사진이 웹툰 변환이 잘 되나요?',
      a: '이목구비가 뚜렷하게 나온 인물 사진이 가장 변환이 잘 됩니다. 너무 어둡거나 흐릿한 사진, 얼굴이 너무 작게 나온 전신 사진은 결과물의 품질이 다소 떨어질 수 있습니다.',
    },
    {
      q: '동영상 변환은 어떻게 작동하나요?',
      a: '동영상을 업로드하면 AI가 영상 내에서 가장 구도가 좋고 선명한 주요 장면들을 자동으로 추출합니다. 사용자는 추출된 장면 중 원하는 컷을 선택하여 웹툰 스타일로 변환할 수 있습니다.',
    },
    {
      q: '결과물이 마음에 들지 않아요.',
      a: 'AI 모델의 특성상 때로는 의도와 다른 결과가 나올 수 있습니다. 이럴 때는 다른 스타일을 선택하거나, 사진의 각도나 조명을 달리하여 다시 시도해 보시면 더 좋은 결과를 얻을 수 있습니다.',
    },
    {
      q: '모바일에서도 사용할 수 있나요?',
      a: '네, BanaToon은 모바일 환경에 완벽하게 최적화되어 있습니다. 아이폰, 안드로이드 등 모든 스마트폰 브라우저에서 PC와 동일한 기능을 편리하게 이용하실 수 있습니다.',
    },
    {
      q: '로그인이 꼭 필요한가요?',
      a: '로그인 없이도 게스트 모드로 체험이 가능합니다. 다만, 변환 기록 저장이나 나만의 갤러리 관리 등 개인화된 기능을 온전히 이용하시려면 로그인을 권장합니다.',
    },
    {
      q: '오류가 발생했어요. 어디로 문의하나요?',
      a: '이용 중 불편한 점이나 버그를 발견하시면 "문의하기" 메뉴를 통해 제보해 주세요. 빠르게 확인하여 개선하도록 하겠습니다. 이메일(twinspa0713@gmail.com)로도 문의가 가능합니다.',
    },
  ];

  return (
    <section className="w-full border-t border-white/10 bg-black/20">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 flex items-center gap-3">
          <QuestionCircleOutlined className="text-2xl text-neonYellow" />
          <h3 className="text-xl font-bold text-white">자주 묻는 질문 (FAQ)</h3>
        </div>

        <div className="space-y-3">
          {faqList.map((item, idx) => (
            <details
              key={idx}
              className="group rounded-xl border border-white/5 bg-white/5 transition-colors open:border-neonYellow/30 open:bg-white/10 hover:border-white/10"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between p-5 [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-white transition-colors group-hover:text-neonYellow">
                  Q. {item.q}
                </span>
                <span className="ml-4 text-gray-500 transition-transform group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <div className="mt-2 border-t border-white/5 px-5 pb-5 pt-4 text-sm leading-relaxed text-gray-300">
                <span className="mr-2 font-bold text-neonYellow">A.</span>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
