// ============================================
// Common Types for Webtoon Converter
// ============================================

// Re-export layout types
export * from './layout';

// ============================================
// Gemini API Types
// ============================================

export interface GeminiTextPart {
  text: string;
}

export interface GeminiInlineDataPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export type GeminiPart = GeminiTextPart | GeminiInlineDataPart;

export interface GeminiContentPart {
  parts: GeminiPart[];
}

export interface GeminiCandidate {
  content: GeminiContentPart;
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

// ============================================
// Database Row Types
// ============================================

export interface GeneratedImageRow {
  id: string;
  r2_key: string;
  original_r2_key?: string;
  prompt?: string;
  type: 'generated' | 'webtoon' | 'premium';
  user_id?: string;
  source_image_ids?: string;
  created_at: number;
}

// ============================================
// Episode Types
// ============================================

export interface PanelStory {
  panelIndex: number;
  dialogue: string | null;
  narration: string | null;
  bubbleStyle: 'normal' | 'thought' | 'shout';
  cameraDirection: string;
  emotion: string;
  sceneDescription: string;
}

export interface EpisodeStoryData {
  title: string;
  synopsis: string;
  panels: PanelStory[];
}

export interface PremiumEpisodeRow {
  id: string;
  user_id: string;
  title: string | null;
  story_data: string;
  source_webtoon_id: string | null;
  panel_ids: string;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  created_at: number;
}

export interface QnaPostRow {
  id: string;
  author_name: string;
  title: string;
  content: string;
  answer?: string;
  answered_at?: number;
  created_at: number;
}

// ============================================
// API Response Types
// ============================================

export interface GalleryImage {
  id: string;
  url: string;
  original_url?: string | null;
  r2_key?: string;
  prompt?: string;
  created_at?: number;
  createdAt?: number;
  type?: string;
}

export interface PremiumImage {
  id: string;
  url: string;
  r2_key: string;
  source_webtoon_id?: string;
  createdAt: number;
}

// ============================================
// Kakao SDK Types
// ============================================

export interface KakaoShare {
  sendDefault: (config: KakaoShareConfig) => void;
}

export interface KakaoShareConfig {
  objectType: 'feed';
  content: {
    title: string;
    description: string;
    imageUrl: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  };
  buttons?: Array<{
    title: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  }>;
}

export interface KakaoSDK {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: KakaoShare;
}

// ============================================
// Cloudflare Workers AI Types
// ============================================

export interface WorkersAI {
  run: (
    model: string,
    options: {
      prompt: string;
      image?: number[];
      [key: string]: unknown;
    }
  ) => Promise<ReadableStream | Uint8Array>;
}

// ============================================
// Error Types
// ============================================

export interface AppError extends Error {
  message: string;
}

// Type guard for checking if an error has a message
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as AppError).message === 'string'
  );
}

// Helper to get error message safely
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}
