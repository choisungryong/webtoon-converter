// 스타일 정의 - UI 표시명과 내부 프롬프트 분리 (저작권 우회)
export interface StyleOption {
    id: string;
    name: string;           // UI에 표시되는 이름 (저작권 안전)
    description: string;    // 짧은 설명
    thumbnail: string;      // 썸네일 이미지 경로
    prompt: string;         // 내부 AI 프롬프트 (사용자에게 노출 안됨)
}

export const STYLE_OPTIONS: StyleOption[] = [
    {
        id: 'watercolor',
        name: '따뜻한 수채화풍',
        description: '부드러운 색감과 따뜻한 분위기',
        thumbnail: '/styles/watercolor.png',
        prompt: 'Studio Ghibli style, soft watercolor textures, Hayao Miyazaki aesthetic, lush green landscape, dreamy atmosphere, warm lighting, hand-painted look, anime illustration'
    },
    {
        id: '3d-cartoon',
        name: '3D 입체 만화',
        description: '매끄러운 3D 렌더링 스타일',
        thumbnail: '/styles/3d-cartoon.png',
        prompt: 'Disney 3D animation style, big expressive eyes, cinematic lighting, Pixar-like soft shading, vibrant colors, smooth skin texture, cartoon character render'
    },
    {
        id: 'dark-fantasy',
        name: '다크 판타지 웹툰',
        description: '강렬한 대비와 화려한 이펙트',
        thumbnail: '/styles/dark-fantasy.png',
        prompt: 'Solo Leveling manhwa style, high contrast, sharp digital line art, glowing blue aura, dramatic shadows, intense cinematic vibe, Korean webtoon, bold black outlines'
    },
    {
        id: 'elegant-fantasy',
        name: '우아한 판타지툰',
        description: '세련된 디지털 페인팅',
        thumbnail: '/styles/elegant-fantasy.png',
        prompt: 'Omniscient Reader\'s Viewpoint style, elegant digital painting, bold lines, unique fantasy color palette, detailed character rendering, Korean manhwa aesthetic'
    },
    {
        id: 'classic-webtoon',
        name: '클래식 웹툰',
        description: '전통적인 한국 웹툰 화풍',
        thumbnail: '/styles/classic-webtoon.png',
        prompt: 'Korean webtoon manhwa style, bold black outlines, cel-shading, flat colors with minimal gradients, anime-style eyes and faces, clean digital illustration'
    }
];

// ID로 스타일 찾기
export function getStyleById(id: string): StyleOption | undefined {
    return STYLE_OPTIONS.find(style => style.id === id);
}

// 기본 스타일
export const DEFAULT_STYLE = STYLE_OPTIONS[0];
