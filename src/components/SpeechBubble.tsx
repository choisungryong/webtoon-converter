'use client';

import React from 'react';

export type BubbleStyle = 'normal' | 'thought' | 'shout';

export interface SpeechBubbleProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  style: BubbleStyle;
  tailDirection?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export default SpeechBubbleProps;
