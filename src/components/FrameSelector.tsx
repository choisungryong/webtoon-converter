'use client';

import React from 'react';
import Image from 'next/image';
import { CheckCircleFilled } from '@ant-design/icons';
import { useTranslations } from 'next-intl';

interface FrameSelectorProps {
  frames: string[];
  selectedIndices: number[];
  maxSelection?: number;
  onToggleSelection: (index: number) => void;
}

export default React.memo(function FrameSelector({
  frames,
  selectedIndices,
  maxSelection = 10,
  onToggleSelection,
}: FrameSelectorProps) {
  const t = useTranslations('FrameSelector');

  if (frames.length === 0) return null;

  return (
    <div>
      <p
        style={{
          color: 'var(--accent-color)',
          fontWeight: 500,
          marginBottom: '12px',
        }}
      >
        {t('title', { current: selectedIndices.length, max: maxSelection })}
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
        }}
      >
        {frames.map((frame, idx) => (
          <div
            key={idx}
            onClick={() => onToggleSelection(idx)}
            style={{
              position: 'relative',
              aspectRatio: '1',
              cursor: 'pointer',
              borderRadius: '8px',
              overflow: 'hidden',
              border: selectedIndices.includes(idx)
                ? '2px solid var(--accent-color)'
                : '2px solid transparent',
            }}
          >
            <Image
              src={frame}
              alt={`Frame ${idx}`}
              fill
              style={{
                objectFit: 'cover',
              }}
              sizes="(max-width: 640px) 33vw, 25vw"
            />
            {selectedIndices.includes(idx) && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.4)',
                }}
              >
                <CheckCircleFilled style={{ color: 'var(--accent-color)', fontSize: '24px' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
