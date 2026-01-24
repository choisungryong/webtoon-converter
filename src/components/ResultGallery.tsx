'use client';

import React, { useState } from 'react';
import { Image, message } from 'antd';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('ResultGallery');
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
      message.success(t('save_success'));
      onSaveComplete();
    } catch (e) {
      message.error(t('save_fail'));
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
          {t('title')}
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
            ? t('saving')
            : isSaved
              ? t('saved')
              : t('save_btn')}
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
              preview={{ mask: t('title') }} // Assuming "title" "변환 결과" is okay for mask, or maybe just leave it generic/empty? Using title for now. Actually ant design preview mask is usually icon or text.
            />
            <div className="bubble-edit-overlay">
              <button
                className="bubble-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditImage(idx);
                }}
              >
                {editedImages[idx] ? t('edit_bubble') : t('add_bubble')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
