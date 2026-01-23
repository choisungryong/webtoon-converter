'use client';

import React from 'react';
import GlassCard from './GlassCard';
import SketchLottieAnimation from './SketchLottieAnimation';

interface ConvertingProgressProps {
  progress: number;
  currentImage: number;
  totalImages: number;
}

export default function ConvertingProgress({
  progress,
  currentImage,
  totalImages,
}: ConvertingProgressProps) {
  return (
    <GlassCard>
      <SketchLottieAnimation
        progress={progress}
        currentImage={currentImage}
        totalImages={totalImages}
      />
    </GlassCard>
  );
}
