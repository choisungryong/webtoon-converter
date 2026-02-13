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
import InsufficientCreditsModal from '../../components/InsufficientCreditsModal';
import StepGuide, { StepProgressBar } from '../../components/StepGuide';

// Hooks & Utils
import { useUserId } from '../../hooks/useUserId';
import {
  compressImage,
  calculateImageDifference,
} from '../../utils/imageUtils';

// Types & Data
import { StyleOption, STYLE_OPTIONS, DEFAULT_STYLE } from '../../data/styles';
import { saveSession, loadSession, clearSession } from '../../lib/sessionStore';
import type { SceneAnalysis, ConversionJobStatus } from '../../types';

// Constants
const MAX_PHOTOS = 5;
const MAX_FRAMES = 10;
const MAX_VIDEO_SIZE_MB = 50;
const DIFF_THRESHOLD = 0.08; // Histogram-based: 0~1 range, lowered to catch subtle scene changes
const MIN_FRAMES = 4; // Minimum frames to extract even if scenes are similar
const MAX_FRAME_DIMENSION = 1920; // Cap captured frame resolution
const COMPARE_SIZE = 480; // Resolution for scene comparison

export default function Home() {
  const t = useTranslations('Home');
  const locale = useLocale();
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
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(1);

  // Result & Editor State
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editedImages, setEditedImages] = useState<Record<number, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  // Background Job State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileUploaderRef = useRef<FileUploaderRef>(null);

  // ============ Session Persistence (survives mobile tab kills) ============
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      // Skip session restore after OAuth login redirect — start fresh
      const params = new URLSearchParams(window.location.search);
      if (params.get('auth') === 'success' || params.get('auth_error')) {
        sessionStorage.removeItem('wt-mode');
        sessionStorage.removeItem('wt-style');
        sessionStorage.removeItem('wt-frame-indices');
        sessionStorage.removeItem('activeJobId');
        sessionStorage.removeItem('activeJobType');
        // Also clear IndexedDB session data from previous account
        clearSession();
        if (!cancelled) setSessionRestored(true);
        return;
      }

      try {
        const savedMode = sessionStorage.getItem('wt-mode') as AppMode | null;
        const savedStyleId = sessionStorage.getItem('wt-style');
        const savedIndices = sessionStorage.getItem('wt-frame-indices');

        if (savedMode && (savedMode === 'photo' || savedMode === 'video')) {
          setMode(savedMode);
        }
        if (savedStyleId) {
          const found = STYLE_OPTIONS.find(s => s.id === savedStyleId);
          if (found) setSelectedStyle(found);
        }

        const savedPreviews = await loadSession<string[]>('photoPreviews');
        if (!cancelled && savedPreviews?.length) {
          setPhotoPreviews(savedPreviews);
        }

        const savedFrames = await loadSession<string[]>('extractedFrames');
        if (!cancelled && savedFrames?.length) {
          setExtractedFrames(savedFrames);
          if (savedIndices) {
            try { setSelectedFrameIndices(JSON.parse(savedIndices)); } catch {}
          }
        }

        if ((savedPreviews?.length || savedFrames?.length) && !cancelled) {
          message.success({ content: t('session_restored'), duration: 2 });
        }
      } catch (e) {
        console.warn('[Session] Restore failed:', e);
      }
      if (!cancelled) setSessionRestored(true);
    }
    restoreSession();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save state changes to IndexedDB/sessionStorage
  useEffect(() => {
    if (!sessionRestored) return;
    sessionStorage.setItem('wt-mode', mode);
  }, [mode, sessionRestored]);

  useEffect(() => {
    if (!sessionRestored) return;
    sessionStorage.setItem('wt-style', selectedStyle.id);
  }, [selectedStyle, sessionRestored]);

  useEffect(() => {
    if (!sessionRestored) return;
    saveSession('photoPreviews', photoPreviews.length > 0 ? photoPreviews : null);
  }, [photoPreviews, sessionRestored]);

  useEffect(() => {
    if (!sessionRestored) return;
    saveSession('extractedFrames', extractedFrames.length > 0 ? extractedFrames : null);
  }, [extractedFrames, sessionRestored]);

  useEffect(() => {
    if (!sessionRestored) return;
    sessionStorage.setItem('wt-frame-indices', JSON.stringify(selectedFrameIndices));
  }, [selectedFrameIndices, sessionRestored]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ============ Background Job Polling ============
  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startJobPolling = (jobId: string, jobType: 'photo' | 'video') => {
    stopPolling();
    setActiveJobId(jobId);
    setConverting(true);
    sessionStorage.setItem('activeJobId', jobId);
    sessionStorage.setItem('activeJobType', jobType);

    let consecutiveFailures = 0;
    const MAX_POLL_FAILURES = 20; // 20 * 3s = 60s of no response → give up
    const MAX_POLL_DURATION_MS = 5 * 60 * 1000; // 5 minutes total → give up
    const pollingStartedAt = Date.now();
    let lastCompletedImages = -1;
    let staleCycles = 0;
    const MAX_STALE_CYCLES = 40; // 40 * 3s = 120s no progress → give up

    const finishPolling = (msgType: 'success' | 'warning' | 'error', content: string, navigateToGallery = false) => {
      stopPolling();
      sessionStorage.removeItem('activeJobId');
      sessionStorage.removeItem('activeJobType');
      setActiveJobId(null);
      if (msgType === 'success') {
        message.success({ content, key: 'job-poll' });
      } else if (msgType === 'warning') {
        message.warning({ content, key: 'job-poll', duration: 5 });
      } else {
        message.error({ content, key: 'job-poll', duration: 5 });
      }
      if (navigateToGallery) {
        clearSession();
        router.push(`/${locale}/gallery?tab=image&showResult=true`);
      }
      setConverting(false);
    };

    pollIntervalRef.current = setInterval(async () => {
      // Global timeout: stop after 5 minutes regardless
      if (Date.now() - pollingStartedAt > MAX_POLL_DURATION_MS) {
        finishPolling('error', t('conversion_failed'));
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      try {
        const res = await fetch(`/api/ai/job/${jobId}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) {
          consecutiveFailures++;
          if (consecutiveFailures >= MAX_POLL_FAILURES) {
            finishPolling('error', t('conversion_failed'));
          }
          return;
        }
        consecutiveFailures = 0;
        const data = await res.json() as {
          status: ConversionJobStatus;
          completedImages: number;
          totalImages: number;
          resultIds: string[];
          failedIndices: number[];
          errorMessage?: string;
        };

        setTotalImagesToConvert(data.totalImages);
        setCurrentImageIndex(data.completedImages);
        setProgress(Math.round((data.completedImages / data.totalImages) * 80));

        // Detect stale progress: same completedImages for too long
        if (data.completedImages === lastCompletedImages && data.status === 'processing') {
          staleCycles++;
          if (staleCycles >= MAX_STALE_CYCLES) {
            // If some images completed, treat as partial success
            if (data.resultIds.length > 0) {
              finishPolling('warning', t('job_partial', {
                success: data.resultIds.length,
                failed: data.totalImages - data.resultIds.length,
              }), true);
            } else {
              finishPolling('error', t('conversion_failed'));
            }
            return;
          }
        } else {
          staleCycles = 0;
          lastCompletedImages = data.completedImages;
        }

        // All images processed but status stuck on 'processing' (worker killed before final update)
        if (data.status === 'processing' && data.completedImages >= data.totalImages && data.totalImages > 0) {
          if (data.resultIds.length > 0) {
            setProgress(100);
            if (data.failedIndices.length > 0) {
              finishPolling('warning', t('job_partial', {
                success: data.resultIds.length,
                failed: data.failedIndices.length,
              }), true);
            } else {
              finishPolling('success', t('convert_complete', { count: data.resultIds.length }), true);
            }
          } else {
            finishPolling('error', t('conversion_failed'));
          }
          return;
        }

        if (['completed', 'failed', 'partial'].includes(data.status)) {
          if (data.status === 'completed') {
            setProgress(100);
            finishPolling('success', t('convert_complete', { count: data.resultIds.length }), true);
          } else if (data.status === 'partial') {
            setProgress(100);
            finishPolling('warning', t('job_partial', {
              success: data.resultIds.length,
              failed: data.failedIndices.length,
            }), true);
          } else {
            finishPolling('error', t('conversion_failed'));
          }
        }
      } catch {
        clearTimeout(timeoutId);
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_POLL_FAILURES) {
          finishPolling('error', t('conversion_failed'));
        }
      }
    }, 3000);
  };

  // Recover active job on mount
  useEffect(() => {
    const savedJobId = sessionStorage.getItem('activeJobId');
    const savedJobType = sessionStorage.getItem('activeJobType') as 'photo' | 'video' | null;
    if (savedJobId && savedJobType) {
      message.info({ content: t('job_resuming'), key: 'job-poll' });
      startJobPolling(savedJobId, savedJobType);
    }
    return () => stopPolling();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Revoke the object URL being removed
    const url = photoPreviews[idx];
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
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

      // Set callbacks BEFORE setting src/load to prevent race condition
      video.onloadedmetadata = () => {
        console.log('Video metadata loaded:', video.duration, video.videoWidth, video.videoHeight);
      };

      video.onerror = () => {
        message.error({
          content: t('video_load_error'),
          duration: 5,
        });
        setAnalyzing(false);
        URL.revokeObjectURL(objectUrl);
      };

      video.src = objectUrl;
      video.load();
      setAnalyzing(true);
    }
  };

  const handleVideoLoaded = async () => {
    if (!videoRef.current || !canvasRef.current) {
      message.error(t('video_load_error'));
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
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      message.error({
        content: t('video_info_error'),
        duration: 5,
      });
      setAnalyzing(false);
      return;
    }

    // Adaptive sample count: short videos get fewer samples, long videos get more
    const analyzeCount = Math.min(60, Math.max(20, Math.round(duration * 2)));
    const interval = duration / (analyzeCount + 1);
    const timestamps = Array.from({ length: analyzeCount }, (_, i) => interval * (i + 1));
    const frames: string[] = [];
    let previousImageData: ImageData | null = null;

    // Calculate capped capture dimensions (max 1920px on longest side)
    let captureW = video.videoWidth;
    let captureH = video.videoHeight;
    if (captureW > MAX_FRAME_DIMENSION || captureH > MAX_FRAME_DIMENSION) {
      if (captureW > captureH) {
        captureH = Math.round(captureH * (MAX_FRAME_DIMENSION / captureW));
        captureW = MAX_FRAME_DIMENSION;
      } else {
        captureW = Math.round(captureW * (MAX_FRAME_DIMENSION / captureH));
        captureH = MAX_FRAME_DIMENSION;
      }
    }

    // Seek helper: waits for seeked event + small render delay
    const seekTo = (time: number): Promise<void> => {
      return new Promise((resolve) => {
        let resolved = false;
        const done = () => {
          if (!resolved) {
            resolved = true;
            video.removeEventListener('seeked', onSeeked);
            // Small delay to ensure frame is actually rendered/decoded
            setTimeout(resolve, 50);
          }
        };
        const onSeeked = () => done();
        video.addEventListener('seeked', onSeeked);
        video.currentTime = time;
        // Fallback timeout: 3 seconds for slow devices/large files
        setTimeout(() => done(), 3000);
      });
    };

    try {
      message.loading({ content: t('analyzing'), key: 'analyze' });

      const compareH = Math.round((COMPARE_SIZE * video.videoHeight) / video.videoWidth);

      for (const time of timestamps) {
        await seekTo(time);

        if (ctx) {
          // Draw at comparison resolution for scene detection
          canvas.width = COMPARE_SIZE;
          canvas.height = compareH;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          if (previousImageData) {
            const diff = calculateImageDifference(previousImageData, currentImageData);
            if (diff > DIFF_THRESHOLD) {
              // Capture at capped resolution
              canvas.width = captureW;
              canvas.height = captureH;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              frames.push(canvas.toDataURL('image/jpeg', 0.8));
            }
          } else {
            // Always capture first frame
            canvas.width = captureW;
            canvas.height = captureH;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.8));
          }
          previousImageData = currentImageData;
        }

        if (frames.length >= 12) break;
      }

      // Fallback: if scene detection found too few frames, sample at uniform intervals
      // No duplicate check — we explicitly want frames even from static videos
      if (frames.length < MIN_FRAMES) {
        console.log(`[FrameExtract] Scene detection found only ${frames.length} frames, falling back to uniform sampling`);
        // Clear scene-detected frames and start fresh with uniform sampling
        frames.length = 0;
        const targetCount = Math.min(8, Math.max(MIN_FRAMES, Math.ceil(duration)));
        const uniformInterval = duration / (targetCount + 1);

        for (let i = 1; i <= targetCount; i++) {
          const time = uniformInterval * i;
          await seekTo(time);

          if (ctx) {
            canvas.width = captureW;
            canvas.height = captureH;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.8));
          }
        }
        console.log(`[FrameExtract] Uniform sampling extracted ${frames.length} frames`);
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

  // ============ Conversion Handlers ============

  /** Single-photo conversion: direct /api/ai/start (no job needed) */
  const handleSinglePhotoConvert = async () => {
    setConverting(true);
    setProgress(0);
    setTotalImagesToConvert(1);
    setCurrentImageIndex(0);

    try {
      const compressedDataUrl = await compressImage(photoPreviews[0]);
      setCurrentImageIndex(1);

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
          if (errorJson.error === 'INSUFFICIENT_CREDITS' || errorJson.error === 'ANONYMOUS_LIMIT_REACHED') {
            setRequiredCredits(1);
            setShowCreditsModal(true);
            return;
          }
          throw new Error(errorJson.error || `Server Error: ${startRes.status}`);
        } catch (e) {
          if ((e as Error).message.includes('INSUFFICIENT') || (e as Error).message.includes('ANONYMOUS_LIMIT')) throw e;
          throw new Error(`Server connection failed (${startRes.status}). Please try again.`);
        }
      }

      const startData = await startRes.json() as any;
      if (startData.error) throw new Error(startData.error);

      if (startData.success && startData.result_url) {
        setProgress(80);
        message.loading({ content: t('saving_gallery'), key: 'photo-save' });

        await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: startData.result_url,
            userId: userId,
            originalImage: compressedDataUrl,
          }),
        });

        setProgress(100);
        message.success({
          content: t('convert_complete', { count: 1 }),
          key: 'photo-save',
        });
        clearSession();
        router.push(`/${locale}/gallery?tab=image&showResult=true`);
      } else {
        throw new Error('No result returned from server');
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      message.error(t('convert_error', { message: errorMessage }));
    } finally {
      setConverting(false);
    }
  };

  /** Multi-photo/video: submit as background job */
  const submitConversionJob = async (
    imageSources: string[],
    jobType: 'photo' | 'video',
  ) => {
    setConverting(true);
    setProgress(0);
    setTotalImagesToConvert(imageSources.length);
    setCurrentImageIndex(0);

    try {
      // Compress all images
      message.loading({ content: t('analyzing_scene'), key: 'job-submit' });
      const compressedImages: string[] = [];
      for (const src of imageSources) {
        compressedImages.push(await compressImage(src));
      }

      // Scene analysis on first image
      let sceneAnalysis: SceneAnalysis | undefined;
      try {
        const analyzeRes = await fetch('/api/ai/analyze-scene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: compressedImages[0] }),
        });
        if (analyzeRes.ok) {
          const analyzeData = await analyzeRes.json();
          if (analyzeData.success) {
            sceneAnalysis = analyzeData.analysis;
          }
        }
      } catch (e) {
        console.warn('[Job] Scene analysis failed, continuing without:', e);
      }

      message.loading({ content: t('job_started'), key: 'job-submit' });

      // Submit job
      const jobRes = await fetch('/api/ai/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: compressedImages,
          styleId: selectedStyle.id,
          userId: userId,
          type: jobType,
          ...(sceneAnalysis && { sceneAnalysis }),
        }),
      });

      if (!jobRes.ok) {
        const errorData = await jobRes.json().catch(() => ({ error: 'Unknown error' })) as any;
        if (errorData.error === 'INSUFFICIENT_CREDITS' || errorData.error === 'ANONYMOUS_LIMIT_REACHED') {
          message.destroy('job-submit');
          setRequiredCredits(compressedImages.length);
          setShowCreditsModal(true);
          setConverting(false);
          return;
        }
        throw new Error(errorData.error || `Server Error: ${jobRes.status}`);
      }

      const { jobId } = await jobRes.json() as { jobId: string; totalImages: number };

      message.success({ content: t('job_started'), key: 'job-submit', duration: 3 });

      // Start polling
      startJobPolling(jobId, jobType);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      message.error({ content: t('convert_error', { message: errorMessage }), key: 'job-submit' });
      setConverting(false);
    }
  };

  const handlePhotoConvert = async () => {
    if (photoPreviews.length === 0) {
      message.warning(t('upload_photo_warning'));
      return;
    }

    if (photoPreviews.length === 1) {
      // Single photo: direct conversion (no job overhead)
      return handleSinglePhotoConvert();
    }

    // Multi-photo: use background job
    return submitConversionJob(photoPreviews, 'photo');
  };

  const handleVideoConvert = async () => {
    if (selectedFrameIndices.length === 0) {
      message.warning(t('select_scenes_warning'));
      return;
    }

    if (extractedFrames.length === 0) {
      message.warning({
        content: t('video_too_short'),
        duration: 5,
      });
      return;
    }

    const imagesToConvert = selectedFrameIndices.map((idx) => extractedFrames[idx]);
    return submitConversionJob(imagesToConvert, 'video');
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
    clearSession();
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

  // Step progress calculation
  const getPhotoStep = () => {
    if (aiImages.length > 0) return 2; // completed
    if (photoPreviews.length > 0) return 1;
    return 0;
  };

  const getVideoStep = () => {
    if (aiImages.length > 0) return 3; // completed
    if (extractedFrames.length > 0 && selectedFrameIndices.length > 0) return 2;
    if (extractedFrames.length > 0) return 1;
    return 0;
  };

  const photoSteps = [
    { label: t('step_photo_short') },
    { label: t('step_style_short') },
  ];

  const videoSteps = [
    { label: t('step_video_short') },
    { label: t('step_scenes_short') },
    { label: t('step_style_short') },
    { label: t('step_complete_short') },
  ];

  const renderPhotoMode = () => (
    <>
      <StepProgressBar steps={photoSteps} currentStep={getPhotoStep()} />
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
      <StepProgressBar steps={videoSteps} currentStep={getVideoStep()} />
      {!videoFile && <StepGuide step={1} text={t('step1_video')} variant="blue" />}
      <GlassCard padding="lg">
        {!videoFile && extractedFrames.length === 0 ? (
          <FileUploader
            ref={fileUploaderRef}
            mode="video"
            onVideoSelect={handleVideoSelect}
            maxVideoSizeMB={MAX_VIDEO_SIZE_MB}
          />
        ) : (
          <div className="py-4 text-center">
            <p style={{ color: 'var(--text-primary)' }}>
              {videoFile?.name || t('restored_video')}
            </p>
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

        <div key={mode} className="section-enter">
          {mode === 'photo' && renderPhotoMode()}
          {mode === 'video' && renderVideoMode()}
        </div>

      </div>

      {/* Speech Bubble Editor Modal */}
      <SpeechBubbleModal
        isOpen={editingImageIndex !== null}
        imageSrc={editingImageIndex !== null ? aiImages[editingImageIndex] : ''}
        onSave={handleEditImageSave}
        onClose={() => setEditingImageIndex(null)}
      />

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        show={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        requiredCredits={requiredCredits}
      />
    </div>
  );
}
