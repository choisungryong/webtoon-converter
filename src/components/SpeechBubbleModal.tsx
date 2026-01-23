'use client';

import React from 'react';
import { message } from 'antd';
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
          suggestedText="대사를 입력하세요"
          onSave={(compositeImageDataUrl) => {
            onSave(compositeImageDataUrl);
            message.success('말풍선이 추가되었습니다!');
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
