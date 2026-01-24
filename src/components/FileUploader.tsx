'use client';

import React, { useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { isValidFileSize } from '../utils/fileUtils';

export type UploadMode = 'photo' | 'video';

interface FileUploaderProps {
  mode: UploadMode;
  onPhotoSelect?: (files: File[], previews: string[]) => void;
  onVideoSelect?: (file: File) => void;
  currentPhotoCount?: number;
  maxPhotos?: number;
  maxVideoSizeMB?: number;
  disabled?: boolean;
}

export interface FileUploaderRef {
  reset: () => void;
  triggerFileInput: () => void;
  triggerCameraInput: () => void;
}

const FileUploader = forwardRef<FileUploaderRef, FileUploaderProps>(
  (
    {
      mode,
      onPhotoSelect,
      onVideoSelect,
      currentPhotoCount = 0,
      maxPhotos = 5,
      maxVideoSizeMB = 50,
      disabled = false,
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
      },
      triggerFileInput: () => fileInputRef.current?.click(),
      triggerCameraInput: () => cameraInputRef.current?.click(),
    }));

    const handlePhotoFiles = (files: FileList) => {
      if (!onPhotoSelect) return;

      const imageFiles: File[] = [];
      const previews: string[] = [];
      const remaining = maxPhotos - currentPhotoCount;
      const maxFiles = Math.min(files.length, remaining);

      for (let i = 0; i < maxFiles; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          imageFiles.push(file);
          previews.push(URL.createObjectURL(file));
        }
      }

      if (imageFiles.length > 0) {
        onPhotoSelect(imageFiles, previews);
      }
    };

    const handleVideoFile = (file: File) => {
      if (!onVideoSelect) return;

      if (!file.type.startsWith('video/')) {
        return;
      }

      if (!isValidFileSize(file.size, maxVideoSizeMB)) {
        return;
      }

      onVideoSelect(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (mode === 'photo') {
        handlePhotoFiles(files);
      } else {
        handleVideoFile(files[0]);
      }

      e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      if (mode === 'photo') {
        handlePhotoFiles(files);
      } else {
        handleVideoFile(files[0]);
      }
    };

    const shouldShowUpload = mode === 'photo' ? currentPhotoCount < maxPhotos : true;
    const hasPhotos = mode === 'photo' && currentPhotoCount > 0;

    if (!shouldShowUpload) return null;

    const handleClick = () => {
      if (!disabled) {
        if (mode === 'photo') {
          fileInputRef.current?.click();
        } else {
          // For video, we don't auto-click since there are two buttons (gallery/camera)
          // But if the user clicks the empty area, maybe we default to gallery?
          // The current UI has explicit buttons for video.
          // Let's only enable area click for photo mode or if the user clicks specific parts.
          // Actually, for photo mode, the whole area should be clickable.
          fileInputRef.current?.click();
        }
      }
    };

    return (
      <div
        className="upload-area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={mode === 'photo' ? handleClick : undefined}
        style={{
          borderColor: isDragging ? 'var(--accent-color)' : 'var(--border-color)',
          background: isDragging ? 'var(--accent-glow)' : 'transparent',
          padding: hasPhotos ? '12px' : '32px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={
            mode === 'photo'
              ? 'image/*'
              : 'video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v'
          }
          multiple={mode === 'photo'}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={disabled}
        />
        {mode === 'video' && (
          <input
            ref={cameraInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={disabled}
          />
        )}

        {mode === 'photo' ? (
          <div
            style={{
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              pointerEvents: 'none', // Allow clicks to pass through to parent
            }}
          >
            {!hasPhotos ? (
              <>
                <div className="upload-icon">
                  <span style={{ fontSize: '32px' }}>📷</span>
                </div>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  사진을 선택하세요!
                </p>
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    marginTop: '8px',
                  }}
                >
                  드래그 & 드롭 · 클릭 (최대 {maxPhotos}장)
                </p>
              </>
            ) : (
              <p
                style={{
                  color: 'var(--accent-color)',
                  fontSize: '13px',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>➕</span> 사진 추가하기 ({maxPhotos - currentPhotoCount}장 더 가능)
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="upload-icon">
              <span style={{ fontSize: '32px' }}>🎬</span>
            </div>
            <p
              className="text-lg font-bold"
              style={{ color: 'var(--text-primary)', marginBottom: '16px' }}
            >
              영상을 선택하세요!
            </p>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'var(--accent-color)',
                  color: 'black',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                📁 갤러리에서 선택
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'transparent',
                  color: 'var(--accent-color)',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: '2px solid var(--accent-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                📹 영상 촬영
              </button>
            </div>

            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '13px',
                marginTop: '12px',
              }}
            >
              MP4, MOV, WebM (최대 {maxVideoSizeMB}MB)
            </p>
            <p
              style={{
                color: '#f59e0b',
                fontSize: '12px',
                marginTop: '8px',
                padding: '8px 12px',
                background: 'rgba(245, 158, 11, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              ⚠️ 구글 드라이브, 클라우드 파일은 지원되지 않습니다.
              <br />
              <span style={{ color: 'var(--text-muted)' }}>
                휴대폰에 저장된 영상만 선택해주세요.
              </span>
            </p>
          </>
        )}
      </div>
    );
  }
);

FileUploader.displayName = 'FileUploader';

export default FileUploader;
