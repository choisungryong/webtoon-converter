'use client';

import React from 'react';
import { message } from 'antd';
import { useTranslations } from 'next-intl';
import SpeechBubbleEditor from './SpeechBubbleEditor';

interface SpeechBubbleModalProps {
  isOpen: boolean;
  imageSrc: string;
  onSave: (compositeImageDataUrl: string) => void;
  onClose: () => void;
}

export default function SpeechBubbleModal({
  isOpen,
  imageSrc,
  onSave,
  onClose,
}: SpeechBubbleModalProps) {
  const t = useTranslations('SpeechBubble');

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <SpeechBubbleEditor
          imageSrc={imageSrc}
          suggestedText={t('placeholder')}
          onSave={(compositeImageDataUrl) => {
            onSave(compositeImageDataUrl);
            message.success(t('added'));
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
