'use client';

import React from 'react';

type StepVariant = 'blue' | 'orange' | 'purple' | 'green';

interface StepGuideProps {
  step: number;
  text: string;
  variant?: StepVariant;
}

const variantStyles: Record<
  StepVariant,
  { bg: string; border: string; text: string; badge: string }
> = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    badge: 'bg-blue-500',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    badge: 'bg-orange-500',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    badge: 'bg-purple-500',
  },
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    badge: 'bg-green-500',
  },
};

export default function StepGuide({
  step,
  text,
  variant = 'blue',
}: StepGuideProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`mb-4 flex items-center gap-2 rounded-lg p-3 ${styles.bg} border ${styles.border}`}
    >
      <span
        className={`flex size-6 items-center justify-center rounded-full ${styles.badge} text-xs font-bold text-white`}
      >
        {step}
      </span>
      <span className={`${styles.text} text-sm`}>{text}</span>
    </div>
  );
}
