'use client';

export const runtime = 'edge';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { message, Spin } from 'antd';
import { useTranslations, useLocale } from 'next-intl';

// Components
import Header, { AppMode, ThemeMode } from '../../components/Header';
import GlassCard from '../../components/GlassCard';
import StyleSelector from '../../components/StyleSelector';
import FileUploader, { FileUploaderRef } from '../../components/FileUploader';
import PhotoPreviewGrid from '../../components/PhotoPreviewGrid';
import FrameSelector from '../../components/FrameSelector';
import ConvertingProgress from '../../components/ConvertingProgress';
import ResultGallery from '../../components/ResultGallery';
import SpeechBubbleModal from '../../components/SpeechBubbleModal';
import StepGuide from '../../components/StepGuide';
import TechnicalGuide from '../../components/TechnicalGuide';

// Hooks & Utils
import { useUserId } from '../../hooks/useUserId';
import {
  compressImage,
  calculateImageDifference,
  stitchImagesVertically,
} from '../../utils/imageUtils';

// Types & Data
import { StyleOption, DEFAULT_STYLE } from '../../data/styles';

// Constants
const MAX_PHOTOS = 5;
const MAX_FRAMES = 10;
const MAX_VIDEO_SIZE_MB = 50;
const DIFF_THRESHOLD = 30;

export default function Home() {
  const t = useTranslations('Home');
  const locale = useLocale();
  const router = useRouter();
  const userId = useUserId();

  // Version Check Log
  useEffect(() => {
    console.log('Webtoon Converter v1.1.2 Loaded - Error Handling Patched');
  }, []);

  // Mode & Theme State
  const [mode, setMode] = useState<AppMode>('video');
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // Photo Mode State
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Video Mode State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [selectedFrameIndices, setSelectedFrameIndices] = useState<number[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Common Conversion State
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>(DEFAULT_STYLE);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [totalImagesToConvert, setTotalImagesToConvert] = useState(0);
  const [aiImages, setAiImages] = useState<string[]>([]);

  // Result & Editor State
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editedImages, setEditedImages] = useState<Record<number, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileUploaderRef = useRef<FileUploaderRef>(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ============ Photo Mode Handlers ============
  const handlePhotoSelect = (files: File[], previews: string[]) => {
    if (photoPreviews.length + previews.length > MAX_PHOTOS) {
      message.warning(t('max_photos_warning', { count: MAX_PHOTOS }));
    }
    setPhotoFiles((prev) => [...prev, ...files]);
    setPhotoPreviews((prev) => [...prev, ...previews]);
    setAiImages([]);
  };

  const handlePhotoRemove = (idx: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // ============ Video Mode Handlers ============
  const handleVideoSelect = (file: File) => {
    if (!file.type.startsWith('video/')) {
      message.error(t('video_format_error'));
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      message.error(t('video_size_error', { size: MAX_VIDEO_SIZE_MB }));
      return;
    }

    setVideoFile(file);
    setExtractedFrames([]);
    setSelectedFrameIndices([]);
    setAiImages([]);

    if (videoRef.current) {
      const video = videoRef.current;
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      video.onloadedmetadata = () => {
        console.log('Video metadata loaded:', video.duration, video.videoWidth, video.videoHeight);
      };

      video.onerror = () => {
        message.error({
          content: t('video_load_error'),
          duration: 5,
        });
        setAnalyzing(false);
        // setVideoFile(null); // Keep the file selected so user sees the error
      };

      video.load();
      setAnalyzing(true);
    }
  };

  const handleVideoLoaded = async () => {
    if (!videoRef.current || !canvasRef.current) {
      message.error('영상 로드 실패: 비디오 요소를 찾을 수 없습니다.'); // This works for dev, maybe extract later
      setAnalyzing(false);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const duration = video.duration;

    if (!duration || duration === Infinity || isNaN(duration)) {
      message.error({
        content: t('video_analyze_error'),
        duration: 5,
      });
      setAnalyzing(false);
      // setVideoFile(null); // Keep file to show error
      setAnalyzing(false);
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      message.error({
        content: t('video_info_error'),
        duration: 5,
      });
      setAnalyzing(false);
      setAnalyzing(false);
      // setVideoFile(null); 
      return;
    }

    const analyzeCount = 20;
    const interval = duration / (analyzeCount + 1);
    const timestamps = Array.from({ length: analyzeCount }, (_, i) => interval * (i + 1));
    const frames: string[] = [];
    let previousImageData: ImageData | null = null;

    try {
      message.loading({ content: t('analyzing'), key: 'analyze' });

      for (const time of timestamps) {
        video.currentTime = time;
        await new Promise((resolve) => {
          video.onseeked = () => resolve(true);
          setTimeout(resolve, 300);
        });

        if (ctx) {
          canvas.width = 320;
          canvas.height = (320 * video.videoHeight) / video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          if (previousImageData) {
            const diff = calculateImageDifference(previousImageData, currentImageData);
            if (diff > DIFF_THRESHOLD) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              frames.push(canvas.toDataURL('image/jpeg', 0.8));
            }
          } else {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.8));
          }
          previousImageData = currentImageData;
        }

        if (frames.length >= 12) break;
      }

      setExtractedFrames(frames);

      // Auto-select frames
      let autoSelectIndices: number[] = [];
      if (frames.length >= 4) {
        autoSelectIndices.push(0);
        const middleIndices = [];
        for (let i = 1; i < frames.length - 1; i++) {
          middleIndices.push(i);
        }
        const middleCount = Math.max(2, Math.min(middleIndices.length, 4));
        const step = middleIndices.length / middleCount;
        for (let i = 0; i < middleCount; i++) {
          const idx = middleIndices[Math.floor(i * step)];
          if (!autoSelectIndices.includes(idx)) {
            autoSelectIndices.push(idx);
          }
        }
        autoSelectIndices.push(frames.length - 1);
        autoSelectIndices.sort((a, b) => a - b);
      } else {
        autoSelectIndices = frames.map((_, i) => i);
      }

      setSelectedFrameIndices(autoSelectIndices.slice(0, MAX_FRAMES));
      message.success({
        content: t('analyze_success', { count: frames.length }),
        key: 'analyze',
      });
    } catch (e) {
      console.error(e);
      message.error({ content: t('analyze_fail'), key: 'analyze' });
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleFrameSelection = (idx: number) => {
    setSelectedFrameIndices((prev) => {
      if (prev.includes(idx)) {
        return prev.filter((i) => i !== idx);
      } else {
        if (prev.length >= MAX_FRAMES) {
          message.warning(t('max_frames_warning', { count: MAX_FRAMES }));
          return prev;
        }
        return [...prev, idx];
      }
    });
  };

  // ============ Utils ============
  const pollJobStatus = async (jobId: string): Promise<string> => {
    const maxAttempts = 60; // 3 minutes timeout (3s * 60)
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 3000));
      attempts++;

      try {
        const res = await fetch(`/api/ai/status?jobId=${jobId}`);
        if (!res.ok) {
          console.warn(`Polling retry: ${res.status}`);
          continue;
        }

        let data;
        try {
          data = await res.json();
        } catch (jsonError) {
          console.error('Invalid JSON response:', jsonError);
          continue;
        }

        if (data.status === 'completed') {
          return data.result_url;
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Conversion failed');
        }

        // If pending or processing, continue polling
      } catch (e) {
        console.warn('Polling error:', e);
        // Continue polling despite temporary network errors
      }
    }
    throw new Error('Conversion timed out');
  };

  // ============ Conversion Handlers ============
  const handlePhotoConvert = async () => {
    if (photoPreviews.length === 0) {
      message.warning(t('upload_photo_warning'));
      return;
    }

    setConverting(true);
    setProgress(0);
    setTotalImagesToConvert(photoPreviews.length);
    setCurrentImageIndex(0);

    const generatedImages: string[] = [];

    try {
      for (let i = 0; i < photoPreviews.length; i++) {
        setCurrentImageIndex(i + 1);
        // Start delay for subsequent images to prevent rate limiting
        if (i > 0) await new Promise((r) => setTimeout(r, 5000));

        const compressedDataUrl = await compressImage(photoPreviews[i]);

        // 1. Start Job
        let startData;
        try {
          const startRes = await fetch('/api/ai/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: compressedDataUrl,
              styleId: selectedStyle.id,
              userId: userId,
            }),
          });

          if (!startRes.ok) {
            const errorText = await startRes.text();
            // Check if it's JSON error or HTML error
            try {
              const errorJson = JSON.parse(errorText);
              throw new Error(errorJson.error || errorJson.message || `Server Error: ${startRes.status}`);
            } catch (e) {
              throw new Error(`Server connection failed (${startRes.status}). Please try again.`);
            }
          }

          startData = await startRes.json();
        } catch (fetchError) {
          console.error('Fetch start error:', fetchError);
          throw new Error((fetchError as Error).message || 'Failed to start conversion');
        }

        if (startData.error === 'DAILY_LIMIT_EXCEEDED' || startData.error === 'QUOTA_EXCEEDED') {
          message.warning({ content: startData.message, duration: 6 });
          break;
        }
        if (startData.error) throw new Error(startData.error);

        // Synchronous Response Handling
        if (startData.success && startData.result_url) {
          generatedImages.push(startData.result_url);
          setProgress(Math.round(((i + 1) / photoPreviews.length) * 80));
        } else {
          throw new Error('No result returned from server');
        }
      }

      if (generatedImages.length === 0) throw new Error(t('no_converted_images'));

      message.loading({ content: t('saving_gallery'), key: 'photo-save' });
      setProgress(90);

      for (const img of generatedImages) {
        await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: img, userId: userId }),
        });
      }

      setProgress(100);
      message.success({
        content: t('convert_complete', { count: generatedImages.length }),
        key: 'photo-save',
      });
      router.push(`/${locale}/gallery?tab=image&showResult=true`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      message.error(`오류: ${errorMessage}`);
    } finally {
      setConverting(false);
      localStorage.removeItem('current_conversion_job');
    }
  };

  const handleVideoConvert = async () => {
    if (selectedFrameIndices.length === 0) {
      message.warning(t('select_scenes_warning'));
      return;
    }

    if (extractedFrames.length < 2) {
      message.warning({
        content: t('video_too_short'),
        duration: 5,
      });
      return;
    }

    if (selectedFrameIndices.length < 2) {
      message.warning(t('min_scenes_warning'));
      return;
    }

    const imagesToConvert = selectedFrameIndices.map((idx) => extractedFrames[idx]);
    setConverting(true);
    setProgress(0);
    setTotalImagesToConvert(imagesToConvert.length);
    setCurrentImageIndex(0);

    const convertedImages: string[] = [];

    try {
      message.loading({
        content: t('convert_start', { count: imagesToConvert.length }),
        key: 'episode',
      });

      for (let i = 0; i < imagesToConvert.length; i++) {
        setCurrentImageIndex(i + 1);
        message.loading({
          content: t('converting_progress', { current: i + 1, total: imagesToConvert.length }),
          key: 'episode',
        });

        if (i > 0) await new Promise((r) => setTimeout(r, 2000));

        const compressedDataUrl = await compressImage(imagesToConvert[i]);

        let startData;
        try {
          const startRes = await fetch('/api/ai/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: compressedDataUrl,
              styleId: selectedStyle.id,
              userId: userId,
            }),
          });

          if (!startRes.ok) {
            const errorText = await startRes.text();
            try {
              const errorJson = JSON.parse(errorText);
              // Check specific quota limits
              if (errorJson.error === 'DAILY_LIMIT_EXCEEDED' || errorJson.error === 'QUOTA_EXCEEDED') {
                message.warning({
                  content: errorJson.message || 'API 한도 초과',
                  key: 'episode',
                });
                return; // Exit function on limit
              }
              throw new Error(errorJson.error || `Server Error: ${startRes.status}`);
            } catch (e) {
              if ((e as Error).message.includes('DAILY_LIMIT')) throw e;
              throw new Error(`Server error (${startRes.status}). The service might be temporarily unavailable.`);
            }
          }
          startData = await startRes.json();
        } catch (fetchError) {
          console.error('Video fetch start error:', fetchError);
          throw fetchError;
        }

        if (startData.error === 'DAILY_LIMIT_EXCEEDED' || startData.error === 'QUOTA_EXCEEDED') {
          message.warning({
            content: startData.message || 'API 한도 초과',
            key: 'episode',
          });
          break;
        }
        if (startData.error) throw new Error(startData.error);

        if (startData.result_url) {
          convertedImages.push(startData.result_url);
        } else if (startData.jobId) {
          // Poll Status for Video Frames
          localStorage.setItem('current_video_job', startData.jobId);
          const resultUrl = await pollJobStatus(startData.jobId);
          if (resultUrl) {
            convertedImages.push(resultUrl);
          }
        } else {
          throw new Error('No result returned from server');
        }

        setProgress(Math.round(((i + 1) / imagesToConvert.length) * 70));
      }

      if (convertedImages.length < 2) throw new Error(t('insufficient_images'));

      message.loading({ content: t('stitching'), key: 'episode' });
      setProgress(75);

      const stitchedImage = await stitchImagesVertically(convertedImages);

      message.loading({ content: t('saving_mywebtoon'), key: 'episode' });
      setProgress(90);

      const saveRes = await fetch('/api/webtoon/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: stitchedImage, userId: userId }),
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({}));
        throw new Error(errData.message || t('save_failed'));
      }

      setProgress(100);
      message.success({
        content: t('episode_complete', { count: convertedImages.length }),
        key: 'episode',
        duration: 3,
      });

      await new Promise((r) => setTimeout(r, 500));
      router.push(`/${locale}/gallery?tab=webtoon&showResult=true`);
    } catch (e) {
      console.error('Video convert error:', e);
      const errorMessage = e instanceof Error ? e.message : t('unknown_error');
      message.error({
        content: t('convert_error', { message: errorMessage }),
        key: 'episode',
        duration: 5,
      });
    } finally {
      setConverting(false);
      localStorage.removeItem('current_video_job');
    }
  };

  // ============ Common Handlers ============
  const handleReset = () => {
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setVideoFile(null);
    setExtractedFrames([]);
    setSelectedFrameIndices([]);
    setAiImages([]);
    setIsSaved(false);
    fileUploaderRef.current?.reset();
  };

  const handleModeChange = (m: AppMode) => {
    if (m === 'gallery') {
      router.push(`/${locale}/gallery`);
    } else {
      setMode(m);
      handleReset();
    }
  };

  const handleEditImageSave = (compositeImageDataUrl: string) => {
    if (editingImageIndex !== null) {
      setEditedImages((prev) => ({
        ...prev,
        [editingImageIndex]: compositeImageDataUrl,
      }));
      setEditingImageIndex(null);
    }
  };

  // ============ Render Helpers ============
  const renderHelpText = () => {
    let helpContent = '';
    if (mode === 'video') helpContent = t('help_video', { maxFrames: MAX_FRAMES });
    if (mode === 'photo') helpContent = t('help_photo', { maxPhotos: MAX_PHOTOS });
    if (mode === 'gallery') helpContent = t('help_gallery');

    return (
      <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
        <p
          className="text-sm text-gray-400"
          dangerouslySetInnerHTML={{
            __html: helpContent.replace(/\n/g, '<br />'),
          }}
        />
      </div>
    );
  };

  const renderPhotoMode = () => (
    <>
      {photoPreviews.length === 0 && (
        <StepGuide step={1} text={t('step1_photo')} variant="blue" />
      )}
      <GlassCard padding={photoPreviews.length > 0 ? 'md' : 'lg'}>
        <FileUploader
          ref={fileUploaderRef}
          mode="photo"
          onPhotoSelect={handlePhotoSelect}
          currentPhotoCount={photoPreviews.length}
          maxPhotos={MAX_PHOTOS}
        />
        <PhotoPreviewGrid
          previews={photoPreviews}
          maxPhotos={MAX_PHOTOS}
          onRemove={handlePhotoRemove}
          onRemoveAll={handleReset}
        />
      </GlassCard>

      {photoPreviews.length > 0 && (
        <>
          {aiImages.length === 0 && (
            <StepGuide step={2} text={t('step2_style')} variant="purple" />
          )}
          <GlassCard>
            <StyleSelector selectedStyleId={selectedStyle.id} onStyleSelect={setSelectedStyle} />
          </GlassCard>

          {converting ? (
            <ConvertingProgress
              progress={progress}
              currentImage={currentImageIndex}
              totalImages={totalImagesToConvert}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '16px',
                width: '100%',
              }}
            >
              <button
                className="accent-btn"
                onClick={handlePhotoConvert}
                disabled={converting}
                style={{ width: '100%', maxWidth: '320px' }}
              >
                {t('convert_btn_photo', { count: photoPreviews.length })}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );

  const renderVideoMode = () => (
    <>
      {!videoFile && <StepGuide step={1} text={t('step1_video')} variant="blue" />}
      <GlassCard padding="lg">
        {!videoFile ? (
          <FileUploader
            ref={fileUploaderRef}
            mode="video"
            onVideoSelect={handleVideoSelect}
            maxVideoSizeMB={MAX_VIDEO_SIZE_MB}
          />
        ) : (
          <div className="py-4 text-center">
            <p style={{ color: 'var(--text-primary)' }}>{videoFile.name}</p>
            {analyzing && <Spin className="mt-2" />}
          </div>
        )}
      </GlassCard>

      {extractedFrames.length > 0 && (
        <>
          {aiImages.length === 0 && (
            <StepGuide
              step={2}
              text={t('step2_scenes', { count: MAX_FRAMES })}
              variant="orange"
            />
          )}
          <GlassCard>
            <FrameSelector
              frames={extractedFrames}
              selectedIndices={selectedFrameIndices}
              maxSelection={MAX_FRAMES}
              onToggleSelection={toggleFrameSelection}
            />
          </GlassCard>

          {aiImages.length === 0 && (
            <StepGuide
              step={3}
              text={t('step3_style')}
              variant="purple"
            />
          )}
          <GlassCard>
            <StyleSelector selectedStyleId={selectedStyle.id} onStyleSelect={setSelectedStyle} />
          </GlassCard>

          {converting ? (
            <ConvertingProgress
              progress={progress}
              currentImage={currentImageIndex}
              totalImages={totalImagesToConvert}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '16px',
                width: '100%',
              }}
            >
              <button
                className="accent-btn"
                onClick={handleVideoConvert}
                disabled={converting}
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                }}
              >
                {t('convert_btn_video')}
              </button>
            </div>
          )}
        </>
      )}

      {aiImages.length > 0 && (
        <>
          <StepGuide
            step={4}
            text={t('step4_complete')}
            variant="green"
          />
          <GlassCard>
            <ResultGallery
              images={aiImages}
              editedImages={editedImages}
              userId={userId}
              isSaved={isSaved}
              onEditImage={setEditingImageIndex}
              onSaveComplete={() => setIsSaved(true)}
            />
          </GlassCard>
        </>
      )}
    </>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--bg-primary)',
        width: '100%',
      }}
    >
      {/* Hidden video/canvas for frame extraction */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        onLoadedData={handleVideoLoaded}
        crossOrigin="anonymous"
        muted
        playsInline
        preload="auto"
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="mx-auto w-full max-w-2xl overflow-hidden px-4 py-6">
        <Header
          mode={mode}
          onModeChange={handleModeChange}
          theme={theme}
          onThemeChange={setTheme}
        />

        {renderHelpText()}

        {mode === 'photo' && renderPhotoMode()}
        {mode === 'video' && renderVideoMode()}

        <TechnicalGuide />
      </div>

      {/* Speech Bubble Editor Modal */}
      <SpeechBubbleModal
        isOpen={editingImageIndex !== null}
        imageSrc={editingImageIndex !== null ? aiImages[editingImageIndex] : ''}
        onSave={handleEditImageSave}
        onClose={() => setEditingImageIndex(null)}
      />
    </div>
  );
}
