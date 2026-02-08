'use client';

import React, { useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { useTranslations } from 'next-intl';
import { message } from 'antd';
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
    const t = useTranslations('FileUploader');
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
        message.error(t('invalid_video_format'));
        return;
      }

      if (!isValidFileSize(file.size, maxVideoSizeMB)) {
        message.error(t('video_size_limit', { size: maxVideoSizeMB }));
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
        fileInputRef.current?.click();
      }
    };

    const icon = mode === 'photo' ? '📷' : '🎬';
    const title = mode === 'photo' ? t('select_photo') : t('select_video');

    return (
      <div
        className={`upload-area${hasPhotos ? ' upload-area--compact' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={mode === 'photo' ? handleClick : undefined}
        style={{
          borderColor: isDragging ? 'var(--accent-color)' : 'var(--border-color)',
          background: isDragging ? 'var(--accent-glow)' : 'transparent',
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

        {hasPhotos ? (
          /* Compact add-more row for photo mode */
          <p className="flex items-center gap-1.5 text-[13px] m-0" style={{ color: 'var(--accent-color)' }}>
            <span>➕</span> {t('add_more_photos', { count: maxPhotos - currentPhotoCount })}
          </p>
        ) : (
          /* Unified initial state for both photo and video */
          <div className="flex flex-col items-center w-full" style={{ pointerEvents: 'none' }}>
            <div className="upload-icon">
              <span className="text-xl">{icon}</span>
            </div>
            <p className="text-[15px] font-bold m-0" style={{ color: 'var(--text-primary)' }}>
              {title}
            </p>
            <p className="text-xs mt-1.5 mb-0" style={{ color: 'var(--text-muted)' }}>
              {mode === 'photo'
                ? t('drag_drop_click', { maxPhotos })
                : t('video_format_guide', { size: maxVideoSizeMB })}
            </p>

            {mode === 'video' && (
              <>
                {/* Action buttons */}
                <div className="flex gap-2 mt-3 w-full max-w-[280px]" style={{ pointerEvents: 'auto' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold border-0 cursor-pointer"
                    style={{
                      background: 'var(--accent-color)',
                      color: 'var(--accent-on-color)',
                    }}
                  >
                    📁 {t('select_from_gallery')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer"
                    style={{
                      background: 'transparent',
                      color: 'var(--accent-color)',
                      border: '1.5px solid var(--accent-color)',
                    }}
                  >
                    📹 {t('record_video')}
                  </button>
                </div>

                {/* Cloud warning - compact inline */}
                <p
                  className="text-[11px] mt-2 mb-0 py-1.5 px-3 rounded-lg"
                  style={{
                    color: '#f59e0b',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                  }}
                >
                  ⚠️ {t('cloud_warning')} — <span style={{ color: 'var(--text-muted)' }}>{t('local_file_only')}</span>
                </p>
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

FileUploader.displayName = 'FileUploader';

export default FileUploader;
