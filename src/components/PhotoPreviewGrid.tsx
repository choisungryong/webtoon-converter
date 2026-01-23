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
      <div className="flex flex-wrap justify-center gap-2">
        {previews.map((preview, idx) => (
          <div
            key={idx}
            className="relative aspect-square w-[calc(33%-6px)] overflow-hidden rounded-lg"
          >
            <Image
              src={preview}
              alt={`Photo ${idx + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 33vw, 25vw"
            />
            <button
              onClick={() => onRemove(idx)}
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full border-none bg-black/70 text-xs text-white hover:bg-black/90"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
