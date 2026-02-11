// 스타일 정의 - UI 표시용 (프롬프트는 API 라우트에서 직접 관리)
export interface StyleOption {
  id: string;
  name: string; // UI에 표시되는 이름 (저작권 안전)
  description: string; // 짧은 설명
  thumbnail: string; // 썸네일 이미지 경로
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'watercolor',
    name: '따뜻한 수채화풍',
    description: '부드러운 색감과 따뜻한 분위기',
    thumbnail: '/styles/watercolor.png?v=2',
  },
  {
    id: 'cinematic-noir',
    name: '시네마틱 누아르',
    description: '묵직한 현대 판타지 분위기',
    thumbnail: '/styles/cinematic-noir.png?v=2',
  },
  {
    id: 'dark-fantasy',
    name: '다크 판타지 웹툰',
    description: '강렬한 대비와 화려한 이펙트',
    thumbnail: '/styles/dark-fantasy.png?v=2',
  },
  {
    id: 'elegant-fantasy',
    name: '우아한 판타지툰',
    description: '세련된 디지털 페인팅',
    thumbnail: '/styles/elegant-fantasy.png?v=2',
  },
  {
    id: 'classic-webtoon',
    name: '클래식 웹툰',
    description: '전통적인 한국 웹툰 화풍',
    thumbnail: '/styles/classic-webtoon.png?v=2',
  },
];

// ID로 스타일 찾기
export function getStyleById(id: string): StyleOption | undefined {
  return STYLE_OPTIONS.find((style) => style.id === id);
}

// 기본 스타일
export const DEFAULT_STYLE = STYLE_OPTIONS[0];
