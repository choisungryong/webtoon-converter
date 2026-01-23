'use client';

import React, { useState } from 'react';
import { Image, message } from 'antd';

interface ResultGalleryProps {
  images: string[];
  editedImages: Record<number, string>;
  userId: string;
  isSaved: boolean;
  onEditImage: (index: number) => void;
  onSaveComplete: () => void;
}

export default function ResultGallery({
  images,
  editedImages,
  userId,
  isSaved,
  onEditImage,
  onSaveComplete,
}: ResultGalleryProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving || isSaved) return;
    setIsSaving(true);

    try {
      for (let i = 0; i < images.length; i++) {
        const imageToSave = editedImages[i] || images[i];
        await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageToSave,
            userId: userId,
          }),
        });
      }
      message.success('갤러리에 저장되었습니다.');
      onSaveComplete();
    } catch (e) {
      message.error('저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  if (images.length === 0) return null;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <p
          style={{
            color: 'var(--accent-color)',
            fontWeight: 500,
            paddingLeft: '4px',
            margin: 0,
          }}
        >
          변환 결과
        </p>
        <button
          onClick={handleSave}
          disabled={isSaving || isSaved}
          className={`transition-transform ${!isSaved && !isSaving ? 'hover:scale-105 active:scale-95' : ''}`}
          style={{
            background: isSaving || isSaved ? '#333' : 'var(--accent-color)',
            color: isSaved ? '#fff' : '#000',
            border: isSaved ? '1px solid #555' : 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isSaving || isSaved ? 'default' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving
            ? '⏳ 저장 중...'
            : isSaved
              ? '✅ 저장 완료'
              : '📁 갤러리 저장'}
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          padding: '4px',
        }}
      >
        {images.map((img, idx) => (
          <div
            key={idx}
            style={{
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Image
              src={editedImages[idx] || img}
              alt={`Result ${idx}`}
              style={{ width: '100%' }}
              preview={{ mask: '크게 보기' }}
            />
            <div className="bubble-edit-overlay">
              <button
                className="bubble-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditImage(idx);
                }}
              >
                {editedImages[idx] ? '✏️ 말풍선 수정' : '💬 말풍선 추가'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
