// 스타일 정의 - UI 표시명과 내부 프롬프트 분리 (저작권 우회)
export interface StyleOption {
  id: string;
  name: string; // UI에 표시되는 이름 (저작권 안전)
  description: string; // 짧은 설명
  thumbnail: string; // 썸네일 이미지 경로
  prompt: string; // 내부 AI 프롬프트 (사용자에게 노출 안됨)
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'watercolor',
    name: '따뜻한 수채화풍',
    description: '부드러운 색감과 따뜻한 분위기',
    thumbnail: '/styles/watercolor.png',
    prompt:
      '[SUBJECT] rendered in a warm, Studio Ghibli inspired animated style. The image features soft, hand-painted watercolor textures with visible brushstrokes, evoking the aesthetic of Hayao Miyazaki. Lush green landscapes and natural elements fill the background. The atmosphere is dreamy and nostalgic, bathed in soft, golden hour lighting. It looks like a traditional hand-drawn illustration.',
  },
  {
    id: 'cinematic-noir',
    name: '시네마틱 누아르',
    description: '묵직한 현대 판타지 분위기',
    thumbnail: '/styles/cinematic-noir.png',
    prompt:
      'A cinematic noir illustration of [SUBJECT] in the style of a gritty Korean thriller webtoon. The aesthetic is dark, moody, and atmospheric, resembling a film still from a crime drama. High-contrast lighting creates dramatic deep shadows and sharp, stark highlights (chiaroscuro). The overall tone is tense, serious, and mysterious with a muted, desaturated color palette.',
  },
  {
    id: 'dark-fantasy',
    name: '다크 판타지 웹툰',
    description: '강렬한 대비와 화려한 이펙트',
    thumbnail: '/styles/dark-fantasy.png',
    prompt:
      "[SUBJECT] depicted in an intense dark fantasy action manhwa style, similar to 'Solo Leveling'. The image features sharp digital line art with bold, distinct black outlines. High contrast lighting creates dramatic shadows. Intense, glowing blue energy auras and magical effects surround key elements. The atmosphere is dynamic, powerful, and cinematic, typical of modern Korean action webtoons.",
  },
  {
    id: 'elegant-fantasy',
    name: '우아한 판타지툰',
    description: '세련된 디지털 페인팅',
    thumbnail: '/styles/elegant-fantasy.png',
    prompt:
      "An elegant digital painting of [SUBJECT] in the style of high-end Korean fantasy webtoons like 'Omniscient Reader's Viewpoint'. The artwork features refined, beautiful character details and sophisticated digital painting techniques. The line work is clean and graceful. The color palette is vibrant yet sophisticated, creating a rich fantasy aesthetic with a soft glow.",
  },
  {
    id: 'classic-webtoon',
    name: '클래식 웹툰',
    description: '전통적인 한국 웹툰 화풍',
    thumbnail: '/styles/classic-webtoon.png',
    prompt:
      'A clean digital illustration of [SUBJECT] in a classic Korean webtoon format. The image uses bold, uniform black outlines and distinct cel-shading techniques with flat colors and minimal gradients. Character features, especially eyes and faces, are drawn in a typical animation style. The overall look is neat, highly readable, and optimized for mobile scrolling.',
  },
];

// ID로 스타일 찾기
export function getStyleById(id: string): StyleOption | undefined {
  return STYLE_OPTIONS.find((style) => style.id === id);
}

// 기본 스타일
export const DEFAULT_STYLE = STYLE_OPTIONS[0];
