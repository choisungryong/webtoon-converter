// Shared types for webtoon layout system

export interface PanelLayout {
  index: number;
  type: 'full-width' | 'half' | 'third' | 'inset-over-prev';
  gutter: 'none' | 'small' | 'medium' | 'large';
  importance: number;
  indent?: 'left' | 'right' | 'center';
}

export interface LayoutAnalysisResponse {
  layouts: PanelLayout[];
  success: boolean;
  fallback?: boolean;
}
