'use client';

import React from 'react';
import Image from 'next/image';

interface PhotoPreviewGridProps {
  previews: string[];
  maxPhotos?: number;
  onRemove: (index: number) => void;
  onRemoveAll: () => void;
}

export default function PhotoPreviewGrid({
  previews,
  maxPhotos = 5,
  onRemove,
  onRemoveAll,
}: PhotoPreviewGridProps) {
  if (previews.length === 0) return null;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <p
          style={{
            color: 'var(--accent-color)',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          선택된 사진 ({previews.length}/{maxPhotos})
        </p>
        <button
          onClick={onRemoveAll}
          style={{
            color: 'var(--text-muted)',
            fontSize: '13px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          전체 삭제
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
        }}
      >
        {previews.map((preview, idx) => (
          <div
            key={idx}
            style={{
              position: 'relative',
              borderRadius: '8px',
              overflow: 'hidden',
              aspectRatio: '1',
            }}
          >
            <Image
              src={preview}
              alt={`Photo ${idx + 1}`}
              fill
              style={{
                objectFit: 'cover',
              }}
              sizes="(max-width: 640px) 33vw, 25vw"
            />
            <button
              onClick={() => onRemove(idx)}
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
