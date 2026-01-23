'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { message, Spin } from 'antd';

// Components
import Header, { AppMode, ThemeMode } from '../components/Header';
import GlassCard from '../components/GlassCard';
import StyleSelector from '../components/StyleSelector';
import FileUploader, { FileUploaderRef } from '../components/FileUploader';
import PhotoPreviewGrid from '../components/PhotoPreviewGrid';
import FrameSelector from '../components/FrameSelector';
import ConvertingProgress from '../components/ConvertingProgress';
import ResultGallery from '../components/ResultGallery';
import SpeechBubbleModal from '../components/SpeechBubbleModal';
import StepGuide from '../components/StepGuide';
import TechnicalGuide from '../components/TechnicalGuide';

// Hooks & Utils
import { useUserId } from '../hooks/useUserId';
import {
  compressImage,
  calculateImageDifference,
  stitchImagesVertically,
} from '../utils/imageUtils';

// Types & Data
import { StyleOption, DEFAULT_STYLE } from '../data/styles';

// Constants
const MAX_PHOTOS = 5;
const MAX_FRAMES = 10;
const MAX_VIDEO_SIZE_MB = 50;
const DIFF_THRESHOLD = 30;

// Help text configuration
const HELP_TEXT = {
  video: {
    text: '💡 사용법: 영상을 업로드하면 AI가 주요 장면을 자동으로 찾아줍니다. 원하는 장면을 선택하고 스타일을 골라 웹툰으로 변환해보세요! (최대 10장)',
  },
  photo: {
    text: '💡 사용법: 사진을 올리고 원하는 그림체를 선택하세요. AI가 멋진 웹툰 스타일로 바꿔드립니다! (최대 5장)',
  },
  gallery: {
    text: '💡 사용법: 변환된 이미지를 선택해서 삭제하거나, 여러 장을 선택해 웹툰 보기로 이어볼 수 있습니다.',
  },
};

export default function Home() {
  const router = useRouter();
  const userId = useUserId();

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
      message.warning(`최대 ${MAX_PHOTOS}장까지만 선택할 수 있습니다.`);
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
      message.error('동영상 파일만 가능합니다.');
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      message.error(`동영상 용량은 ${MAX_VIDEO_SIZE_MB}MB 이하여야 합니다.`);
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
          content:
            '영상을 불러올 수 없습니다. 클라우드 파일이 아닌 휴대폰에 저장된 영상을 선택해주세요.',
          duration: 5,
        });
        setAnalyzing(false);
        setVideoFile(null);
      };

      video.load();
      setAnalyzing(true);
    }
  };

  const handleVideoLoaded = async () => {
    if (!videoRef.current || !canvasRef.current) {
      message.error('영상 로드 실패: 비디오 요소를 찾을 수 없습니다.');
      setAnalyzing(false);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const duration = video.duration;

    if (!duration || duration === Infinity || isNaN(duration)) {
      message.error({
        content:
          '영상을 분석할 수 없습니다. 클라우드 파일이 아닌 휴대폰에 저장된 영상을 선택해주세요.',
        duration: 5,
      });
      setAnalyzing(false);
      setVideoFile(null);
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      message.error({
        content:
          '영상 정보를 읽을 수 없습니다. 클라우드 파일이 아닌 휴대폰에 저장된 영상을 선택해주세요.',
        duration: 5,
      });
      setAnalyzing(false);
      setVideoFile(null);
      return;
    }

    const analyzeCount = 20;
    const interval = duration / (analyzeCount + 1);
    const timestamps = Array.from({ length: analyzeCount }, (_, i) => interval * (i + 1));
    const frames: string[] = [];
    let previousImageData: ImageData | null = null;

    try {
      message.loading({ content: '주요 장면 심층 분석 중...', key: 'analyze' });

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
        content: `분석 완료! ${frames.length}개의 주요 장면을 찾았습니다.`,
        key: 'analyze',
      });
    } catch (e) {
      console.error(e);
      message.error({ content: '장면 분석 실패', key: 'analyze' });
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
          message.warning(`최대 ${MAX_FRAMES}장까지만 선택할 수 있습니다.`);
          return prev;
        }
        return [...prev, idx];
      }
    });
  };

  // ============ Conversion Handlers ============
  const handlePhotoConvert = async () => {
    if (photoPreviews.length === 0) {
      message.warning('먼저 사진을 업로드해 주세요!');
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
        if (i > 0) await new Promise((r) => setTimeout(r, 10000));

        const compressedDataUrl = await compressImage(photoPreviews[i]);
        const res = await fetch('/api/ai/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: compressedDataUrl,
            styleId: selectedStyle.id,
            userId: userId,
          }),
        });
        const data = await res.json();

        if (data.error === 'DAILY_LIMIT_EXCEEDED' || data.error === 'QUOTA_EXCEEDED') {
          message.warning({ content: data.message, duration: 6 });
          break;
        }
        if (data.error) throw new Error(data.error);

        if (data.success && data.image) {
          generatedImages.push(data.image);
          setProgress(Math.round(((i + 1) / photoPreviews.length) * 80));
        }
      }

      if (generatedImages.length === 0) throw new Error('변환된 이미지가 없습니다.');

      message.loading({ content: '갤러리에 저장 중...', key: 'photo-save' });
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
        content: `${generatedImages.length}장 변환 완료!`,
        key: 'photo-save',
      });
      router.push('/gallery?tab=image&showResult=true');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      message.error(`오류: ${errorMessage}`);
    } finally {
      setConverting(false);
    }
  };

  const handleVideoConvert = async () => {
    if (selectedFrameIndices.length === 0) {
      message.warning('변환할 장면을 선택해 주세요!');
      return;
    }

    if (extractedFrames.length < 2) {
      message.warning({
        content:
          '영상이 너무 짧아 2장 이상의 장면을 추출할 수 없습니다. 더 긴 영상을 업로드해 주세요!',
        duration: 5,
      });
      return;
    }

    if (selectedFrameIndices.length < 2) {
      message.warning('웹툰을 만들려면 최소 2장 이상의 장면을 선택해 주세요!');
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
        content: `${imagesToConvert.length}장 변환 시작...`,
        key: 'episode',
      });

      for (let i = 0; i < imagesToConvert.length; i++) {
        setCurrentImageIndex(i + 1);
        message.loading({
          content: `${i + 1}/${imagesToConvert.length} 변환 중...`,
          key: 'episode',
        });

        if (i > 0) await new Promise((r) => setTimeout(r, 10000));

        const compressedDataUrl = await compressImage(imagesToConvert[i]);
        const res = await fetch('/api/ai/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: compressedDataUrl,
            styleId: selectedStyle.id,
            userId: userId,
          }),
        });

        const data = await res.json();

        if (data.error === 'DAILY_LIMIT_EXCEEDED' || data.error === 'QUOTA_EXCEEDED') {
          message.warning({
            content: data.message || 'API 한도 초과',
            key: 'episode',
          });
          break;
        }
        if (data.error) throw new Error(data.error);

        if (data.success && data.image) {
          convertedImages.push(data.image);
        }

        setProgress(Math.round(((i + 1) / imagesToConvert.length) * 70));
      }

      if (convertedImages.length < 2) throw new Error('변환된 이미지가 부족합니다.');

      message.loading({ content: '이미지 합치는 중...', key: 'episode' });
      setProgress(75);

      const stitchedImage = await stitchImagesVertically(convertedImages);

      message.loading({ content: '마이웹툰에 저장 중...', key: 'episode' });
      setProgress(90);

      const saveRes = await fetch('/api/webtoon/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: stitchedImage, userId: userId }),
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({}));
        throw new Error(errData.message || '저장 실패');
      }

      setProgress(100);
      message.success({
        content: `${convertedImages.length}장 에피소드 생성 완료!`,
        key: 'episode',
        duration: 3,
      });

      await new Promise((r) => setTimeout(r, 500));
      router.push('/gallery?tab=webtoon&showResult=true');
    } catch (e) {
      console.error('Video convert error:', e);
      const errorMessage = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다';
      message.error({
        content: `변환 오류: ${errorMessage}`,
        key: 'episode',
        duration: 5,
      });
    } finally {
      setConverting(false);
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
      router.push('/gallery');
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
  const renderHelpText = () => (
    <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
      <p
        className="text-sm text-gray-400"
        dangerouslySetInnerHTML={{
          __html: HELP_TEXT[mode].text.replace(/\n/g, '<br />'),
        }}
      />
    </div>
  );

  const renderPhotoMode = () => (
    <>
      {photoPreviews.length === 0 && (
        <StepGuide step={1} text="먼저 변환할 사진을 선택해주세요" variant="blue" />
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
            <StepGuide step={2} text="원하는 웹툰 스타일을 선택하세요" variant="purple" />
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
                ✨ {photoPreviews.length}장 웹툰으로 변환하기
              </button>
            </div>
          )}
        </>
      )}
    </>
  );

  const renderVideoMode = () => (
    <>
      {!videoFile && <StepGuide step={1} text="먼저 변환할 영상을 선택해주세요" variant="blue" />}
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
              text={`변환할 장면을 클릭해서 선택하세요 (최대 ${MAX_FRAMES}장)`}
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
              text="원하는 웹툰 스타일을 선택하고 변환 버튼을 누르세요"
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
                ✨ 웹툰으로 변환
              </button>
            </div>
          )}
        </>
      )}

      {aiImages.length > 0 && (
        <>
          <StepGuide
            step={4}
            text="변환 완료! 💬 말풍선을 추가하고 갤러리에 저장하세요"
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
