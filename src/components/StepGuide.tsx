'use client';

import React from 'react';
import { CheckCircleFilled } from '@ant-design/icons';

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

// Step Progress Bar Component
interface StepProgressBarProps {
  steps: { label: string }[];
  currentStep: number; // 0-indexed
}

export function StepProgressBar({ steps, currentStep }: StepProgressBarProps) {
  return (
    <div className="mb-6 flex items-center justify-center px-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={index}>
            {/* Step circle + label */}
            <div className="flex flex-col items-center">
              <div
                className={`flex size-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-[var(--accent-color)] text-[var(--accent-on-color)] shadow-accent'
                      : 'bg-white/10 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <CheckCircleFilled className="text-sm" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-1.5 hidden text-[11px] font-medium min-[480px]:block ${
                  isCompleted
                    ? 'text-green-400'
                    : isCurrent
                      ? 'text-[var(--accent-color)]'
                      : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`mx-1.5 h-0.5 max-w-[60px] flex-1 transition-colors ${
                  isCompleted ? 'bg-green-500' : 'bg-white/10'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
