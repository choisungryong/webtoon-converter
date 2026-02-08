'use client';

export const runtime = 'edge';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Spin, Modal, message } from 'antd';
import { useTranslations, useLocale } from 'next-intl';
import {
  ReloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CheckCircleFilled,
  DownloadOutlined,
  ShareAltOutlined,
  MessageOutlined,
  StarFilled,
} from '@ant-design/icons';

import Link from 'next/link';
import Image from 'next/image';
import GlassCard from '../../../components/GlassCard';
import WebtoonViewer from '../../../components/WebtoonViewer';
import EpisodeViewer from '../../../components/EpisodeViewer';
import type { PanelLayout, KakaoSDK, EpisodeStoryData, PanelStory } from '../../../types';
import { formatToKoreanDate, getRelativeDateLabel } from '../../../utils/dateUtils';
import { downloadFile, generateTimestampedFilename } from '../../../utils/fileUtils';
import { generateUUID, delay } from '../../../utils/commonUtils';

// Extend Window interface for Kakao SDK
declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

interface GalleryImage {
  id: string;
  url: string;
  original_url?: string;
  r2_key: string;
  prompt?: string;
  created_at?: number;
  createdAt?: number;
}

// Helper function to group images by date
const groupImagesByDate = (images: GalleryImage[]): Map<string, GalleryImage[]> => {
  const groups = new Map<string, GalleryImage[]>();

  images.forEach((img) => {
    const timestamp = img.createdAt || img.created_at || 0;
    const dateKey = formatToKoreanDate(timestamp);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(img);
  });

  return groups;
};

function GalleryContent() {
  const t = useTranslations('Gallery');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'image' | 'webtoon' | 'premium'>('image');
  const [savingWebtoon, setSavingWebtoon] = useState(false);
  const [viewMode, setViewMode] = useState<'processed' | 'original'>('processed');

  // 결과 팝업 상태 (URL에서 showResult=true일 때 표시)
  const [showResultModal, setShowResultModal] = useState(false);
  const [latestResult, setLatestResult] = useState<GalleryImage | null>(null);
  // 최신 이미지 하이라이트 (팝업 닫은 후 표시)
  const [highlightLatest, setHighlightLatest] = useState(false);

  // Premium Gallery State
  const [premiumImages, setPremiumImages] = useState<GalleryImage[]>([]);
  const [loadingPremium, setLoadingPremium] = useState(false);
  const [convertingPremium, setConvertingPremium] = useState(false);

  // Episode State
  const [episodeCreating, setEpisodeCreating] = useState(false);
  const [episodeStory, setEpisodeStory] = useState<EpisodeStoryData | null>(null);
  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const [episodeProgress, setEpisodeProgress] = useState({ current: 0, total: 0 });
  const [showStoryPreview, setShowStoryPreview] = useState(false);
  const [showEpisodeViewer, setShowEpisodeViewer] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [webtoonPreviewImage, setWebtoonPreviewImage] = useState<GalleryImage | null>(null);
  const [isPremiumPreview, setIsPremiumPreview] = useState(false); // 프리미엄 이미지 여부
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [webtoonViewOpen, setWebtoonViewOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const webtoonScrollRef = useRef<HTMLDivElement | null>(null);
  const premiumScrollRef = useRef<HTMLDivElement | null>(null);

  // Separate state for premium preview (to not share scroll with webtoon)
  const [premiumPreviewImage, setPremiumPreviewImage] = useState<GalleryImage | null>(null);

  // Smart Layout State
  const [smartLayoutEnabled, setSmartLayoutEnabled] = useState(false);
  const [panelLayouts, setPanelLayouts] = useState<PanelLayout[]>([]);
  const [analyzingLayout, setAnalyzingLayout] = useState(false);

  // Mobile long-press handlers
  const handleTouchStart = (imgId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedImages((prev) => (prev.includes(imgId) ? prev : [...prev, imgId]));
      if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Scroll to top when webtoon preview opens
  useEffect(() => {
    if (webtoonPreviewImage && webtoonScrollRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        webtoonScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      }, 50);
    }
  }, [webtoonPreviewImage]);

  const [userId, setUserId] = useState<string>('');

  // Initialize User ID
  useEffect(() => {
    const storedUserId = localStorage.getItem('toonsnap_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newUserId = generateUUID();
      localStorage.setItem('toonsnap_user_id', newUserId);
      setUserId(newUserId);
    }
  }, []);

  // Handle URL query parameters (tab, showResult)
  useEffect(() => {
    const tab = searchParams.get('tab');
    const showResult = searchParams.get('showResult');

    if (tab === 'webtoon') {
      setActiveTab('webtoon');
    } else if (tab === 'image') {
      setActiveTab('image');
    } else if (tab === 'premium') {
      setActiveTab('premium');
    }

    if (showResult === 'true') {
      setShowResultModal(true);
      // URL에서 쿼리 파라미터 제거 (히스토리 정리)
      router.replace(`/${locale}/gallery` + (tab ? `?tab=${tab}` : ''), {
        scroll: false,
      });
    }
  }, [searchParams, router]);

  // Initialize Kakao SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        // REPLACE WITH YOUR ACTUAL KAKAO JAVASCRIPT KEY
        window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_API_KEY || '');
      }
    }
  }, []);

  const handleShare = async (imageUrl: string) => {
    // 1. Try generic Web Share API (Mobile native share sheet)
    if (navigator.share) {
      try {
        // We verify if it is a blob URL or remote URL.
        // Creating a file object might be better for image sharing support on some platforms.
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'image.png', { type: blob.type });

        await navigator.share({
          title: 'BanaToon Image',
          text: 'Check out this Webtoon style image!',
          files: [file],
        });
        return;
      } catch (err) {
        console.log('Error sharing:', err);
        // Fallback or user cancelled
      }
    }

    // Fallback: Copy to clipboard if Web Share fails or not supported (Desktop)
    try {
      await navigator.clipboard.writeText(imageUrl);
      message.success(t('share_success'));
    } catch (err) {
      message.error(t('share_fail'));
    }
  };

  const handleKakaoShare = (imageUrl: string) => {
    if (typeof window === 'undefined' || !window.Kakao) {
      message.error(t('kakao_error_sdk'));
      return;
    }

    if (!window.Kakao.isInitialized()) {
      message.error(t('kakao_error_init'));
      return;
    }

    // Convert relative URL to absolute URL (Required for Kakao)
    // Ensure we use the PRODUCTION domain for both Image and Link,
    // because Kakao cannot access Localhost images/links.
    const productionOrigin = 'https://banatoon.app';

    // Force Production URL always to match Kakao Developers settings
    const targetOrigin = productionOrigin;

    const absoluteImageUrl = new URL(imageUrl, targetOrigin).toString();

    // 공유 전용 페이지 - 받는 사람이 이미지를 볼 수 있음
    const shareLink = new URL(
      `/share?image=${encodeURIComponent(absoluteImageUrl)}`,
      targetOrigin
    ).toString();

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: t('kakao_share_title'),
        description: t('kakao_share_desc'),
        imageUrl: absoluteImageUrl,
        link: {
          mobileWebUrl: shareLink,
          webUrl: shareLink,
        },
      },
      buttons: [
        {
          title: t('kakao_btn_view'),
          link: {
            mobileWebUrl: shareLink,
            webUrl: shareLink,
          },
        },
      ],
    });
  };

  const fetchImages = async () => {
    setLoading(true);
    try {
      const currentUserId = localStorage.getItem('toonsnap_user_id');
      console.log('Fetching Gallery for User ID:', currentUserId); // DEBUG
      const headers: HeadersInit = {};
      if (currentUserId) {
        headers['x-user-id'] = currentUserId;
      } else {
        console.warn('No User ID found in localStorage during fetch!');
      }

      // Fallback: Headers are being stripped, so we use Query Param as primary method
      const url = `/api/gallery?type=${activeTab}&userId=${currentUserId}`;
      const res = await fetch(url, { headers, cache: 'no-store' });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Server Error: ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setImages(data.images || []);
      setSelectedImages([]); // Reset selection on tab change
    } catch (err) {
      console.error('Fetch Error:', err);
      const errorMessage = err instanceof Error ? err.message : t('fetch_error');
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userId]);

  // Fetch Premium Gallery
  const fetchPremiumImages = async () => {
    setLoadingPremium(true);
    try {
      const currentUserId = localStorage.getItem('toonsnap_user_id');
      const res = await fetch(`/api/premium/gallery?userId=${currentUserId}`);
      const data = await res.json();
      setPremiumImages(data.images || []);
    } catch (err) {
      console.error('Premium fetch error:', err);
    } finally {
      setLoadingPremium(false);
    }
  };

  useEffect(() => {
    if (userId && activeTab === 'premium') {
      fetchPremiumImages();
      fetchEpisodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userId]);

  // Episode Creation - Stage 1: Generate Story
  const handleCreateEpisode = async () => {
    if (!webtoonPreviewImage) return;
    setEpisodeCreating(true);

    try {
      const currentUserId = localStorage.getItem('toonsnap_user_id');

      const res = await fetch('/api/premium/episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webtoonId: webtoonPreviewImage.id,
          userId: currentUserId,
          locale: locale,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'NO_SOURCE_IMAGES') {
          message.error(t('episode_no_source'));
          return;
        }
        throw new Error(data.error || 'Story generation failed');
      }

      setEpisodeStory(data.story);
      setEpisodeId(data.episodeId);
      setShowStoryPreview(true);
    } catch (err) {
      console.error('Episode creation error:', err);
      message.error(t('episode_story_fail'));
    } finally {
      setEpisodeCreating(false);
    }
  };

  // Episode Creation - Stage 2: Convert panels
  const handleGenerateEpisode = async () => {
    if (!episodeStory || !webtoonPreviewImage) return;
    setShowStoryPreview(false);
    setConvertingPremium(true);
    const totalPanels = episodeStory.panels.length;
    setEpisodeProgress({ current: 0, total: totalPanels });

    try {
      const currentUserId = localStorage.getItem('toonsnap_user_id');

      // Fetch source image IDs from the webtoon record
      const webtoonRes = await fetch(`/api/gallery/${webtoonPreviewImage.id}/source-images?userId=${currentUserId}`);
      let sourceImageIds: string[] = [];
      if (webtoonRes.ok) {
        const webtoonData = await webtoonRes.json();
        sourceImageIds = webtoonData.sourceImageIds || [];
      }

      let styleReference: string | undefined;
      const panelResults: any[] = [];

      for (let i = 0; i < totalPanels; i++) {
        setEpisodeProgress({ current: i + 1, total: totalPanels });
        const panel = episodeStory.panels[i];

        // Get source image for this panel by ID
        const sourceId = sourceImageIds[i];
        if (!sourceId) continue;

        // Fetch the source image as base64
        const imgRes = await fetch(`/api/gallery/${sourceId}/image`);
        if (!imgRes.ok) continue;

        const blob = await imgRes.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const storyDirection = `Camera: ${panel.cameraDirection}. Emotion: ${panel.emotion}. Scene: ${panel.sceneDescription}`;

        // Add delay between conversions to avoid rate limiting
        if (i > 0) await new Promise((r) => setTimeout(r, 2000));

        const convertRes = await fetch('/api/premium/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            sourceWebtoonId: webtoonPreviewImage.id,
            userId: currentUserId,
            storyDirection,
            episodeId: episodeId || undefined,
            panelIndex: i,
            styleReference: i > 0 ? styleReference : undefined,
          }),
        });

        const convertData = await convertRes.json();

        if (convertRes.ok && convertData.success) {
          panelResults.push({
            ...panel,
            imageId: convertData.imageId,
            imageUrl: `/api/premium/${convertData.imageId}/image`,
          });

          if (i === 0 && convertData.imageId) {
            styleReference = convertData.imageId;
          }
        } else {
          panelResults.push({ ...panel, imageId: null, imageUrl: null });
        }
      }

      setCurrentEpisode({
        id: episodeId,
        title: episodeStory.title,
        synopsis: episodeStory.synopsis,
        panels: panelResults,
      });
      setWebtoonPreviewImage(null);
      setShowEpisodeViewer(true);
      message.success(t('episode_complete'));
      fetchEpisodes();
    } catch (err) {
      console.error('Episode generation error:', err);
      message.error(t('episode_story_fail'));
    } finally {
      setConvertingPremium(false);
      setEpisodeProgress({ current: 0, total: 0 });
    }
  };

  // Fetch episodes for premium tab
  const fetchEpisodes = async () => {
    try {
      const currentUserId = localStorage.getItem('toonsnap_user_id');
      const res = await fetch(`/api/premium/gallery?userId=${currentUserId}&type=episodes`);
      const data = await res.json();
      setEpisodes(data.episodes || []);
    } catch (err) {
      console.error('Episodes fetch error:', err);
    }
  };

  // Load episode detail and show viewer
  const handleViewEpisode = async (epId: string) => {
    try {
      const currentUserId = localStorage.getItem('toonsnap_user_id');
      const res = await fetch(`/api/premium/episode/${epId}?userId=${currentUserId}`);
      const data = await res.json();
      if (res.ok) {
        setCurrentEpisode(data);
        setShowEpisodeViewer(true);
      }
    } catch (err) {
      console.error('Episode load error:', err);
    }
  };

  // Delete Premium Image
  const handlePremiumDelete = async (imageId: string) => {
    if (!window.confirm(t('premium_delete_confirm'))) return;

    try {
      const currentUserId = localStorage.getItem('toonsnap_user_id');
      const res = await fetch(`/api/premium/gallery?id=${imageId}&userId=${currentUserId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Delete failed');

      setPremiumImages((prev) => prev.filter((img) => img.id !== imageId));
      message.success(t('delete_success'));
    } catch (err) {
      message.error(t('delete_fail'));
    }
  };

  // Memory-optimized: Sequential image loading + explicit cleanup
  const handleWebtoonSave = async () => {
    if (selectedImages.length === 0) return;
    setSavingWebtoon(true);

    let canvas: HTMLCanvasElement | null = null;

    try {
      // 1. Sort selected images by selection order
      const sortedSelectedImages = images
        .filter((img) => selectedImages.includes(img.id))
        .sort((a, b) => selectedImages.indexOf(a.id) - selectedImages.indexOf(b.id));

      // Helper to load a single image
      const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('이미지 로드 실패'));
          img.src = url;
        });
      };

      // 2. Phase 1: Calculate dimensions (load once, get sizes, release)
      const dimensions: {
        url: string;
        width: number;
        height: number;
        scaledHeight: number;
      }[] = [];
      let maxWidth = 0;

      for (const imgData of sortedSelectedImages) {
        const img = await loadImage(imgData.url);
        if (img.width > maxWidth) maxWidth = img.width;
        dimensions.push({
          url: imgData.url,
          width: img.width,
          height: img.height,
          scaledHeight: 0,
        });
        // Release immediately
        img.src = '';
        img.onload = null;
        img.onerror = null;
      }

      // Calculate scaled heights and total
      const TARGET_WIDTH = Math.min(maxWidth, 800); // Cap at 800px for mobile
      let totalHeight = 0;
      for (const dim of dimensions) {
        const scale = TARGET_WIDTH / dim.width;
        dim.scaledHeight = Math.round(dim.height * scale);
        totalHeight += dim.scaledHeight;
      }

      // Mobile memory safety check
      if (totalHeight > 8000) {
        throw new Error(t('image_too_long'));
      }

      // 3. Phase 2: Create canvas and draw images sequentially
      canvas = document.createElement('canvas');
      canvas.width = TARGET_WIDTH;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: false });

      if (!ctx) throw new Error('Canvas context not available');

      let currentY = 0;
      for (const dim of dimensions) {
        const img = await loadImage(dim.url);
        ctx.drawImage(img, 0, currentY, TARGET_WIDTH, dim.scaledHeight);
        currentY += dim.scaledHeight;

        // Release image immediately after drawing
        img.src = '';
        img.onload = null;
        img.onerror = null;

        // Give browser a chance to GC
        await delay(10);
      }

      // 4. Convert to Data URL with lower quality for mobile
      const webtoonDataUrl = canvas.toDataURL('image/jpeg', 0.8);

      // Validate result
      if (!webtoonDataUrl || webtoonDataUrl === 'data:,' || webtoonDataUrl.length < 1000) {
        throw new Error(t('canvas_error'));
      }

      // 5. Save to Server
      const userId = localStorage.getItem('toonsnap_user_id');
      if (userId) {
        // Pass source image IDs in selection order for episode creation later
        const sortedIds = sortedSelectedImages.map((img) => img.id);
        const res = await fetch('/api/webtoon/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: webtoonDataUrl, userId, sourceImageIds: sortedIds }),
        });

        if (!res.ok) {
          throw new Error(t('save_server_fail'));
        }

        message.success(t('save_mywebtoon_success'));
        setActiveTab('webtoon');
        setWebtoonViewOpen(false);
        setSelectedImages([]);
        setIsSelectionMode(false);
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : t('save_mywebtoon_fail');
      message.error(errorMessage);
    } finally {
      // Explicitly release canvas memory
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
      setSavingWebtoon(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!window.confirm(t('delete_confirm'))) {
      return;
    }

    setDeleting(imageId);
    try {
      const currentUserId = localStorage.getItem('toonsnap_user_id');
      const res = await fetch(`/api/gallery/${imageId}?userId=${currentUserId}`, {
        method: 'DELETE',
        headers: currentUserId ? { 'x-user-id': currentUserId } : {},
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to delete');
      }

      setImages((prev) => prev.filter((img) => img.id !== imageId));
      message.success(t('delete_success'));
      // If deleting via modal, close it
      if (previewImage) setPreviewImage(null);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || t('delete_fail'));
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      await downloadFile(url, filename);
    } catch (err) {
      message.error(t('download_fail'));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) return;

    if (!window.confirm(t('bulk_delete_confirm', { count: selectedImages.length }))) {
      return;
    }

    setDeleting('bulk');
    try {
      const currentUserId = localStorage.getItem('toonsnap_user_id');
      const results = await Promise.all(
        selectedImages.map((id) =>
          fetch(`/api/gallery/${id}?userId=${currentUserId}`, {
            method: 'DELETE',
            headers: currentUserId ? { 'x-user-id': currentUserId } : {},
          }).then((res) => ({ id, ok: res.ok }))
        )
      );

      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        console.error('Failed to delete some images:', failed);
        message.warning(t('bulk_delete_partial_fail', { count: failed.length }));
      }

      const successfulIds = results.filter((r) => r.ok).map((r) => r.id);
      setImages((prev) => prev.filter((img) => !successfulIds.includes(img.id)));
      setSelectedImages((prev) => prev.filter((id) => !successfulIds.includes(id)));

      if (failed.length === 0) {
        message.success(t('delete_success'));
      }
    } catch (err) {
      console.error(err);
      message.error(t('bulk_delete_error'));
    } finally {
      setDeleting(null);
      setIsSelectionMode(false);
    }
  };

  return (
    <main className="bg-[#0a0a0a] p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="animate-fade-in flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/${locale}`} className="text-gray-400 transition-colors hover:text-white">
              {t('home_link')}
            </Link>
            <h1 className="text-2xl font-bold text-white">
              {t('title_prefix')} <span className="text-neonYellow">{t('title_suffix')}</span>
            </h1>
          </div>

          {/* Tabs */}
          <div className="order-last flex w-full justify-center rounded-xl bg-white/10 p-1 md:order-none md:w-auto">
            <button
              onClick={() => setActiveTab('image')}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${activeTab === 'image'
                ? 'bg-neonYellow font-bold text-black shadow-lg'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              {t('tab_mysnap')}
            </button>
            <button
              onClick={() => setActiveTab('webtoon')}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${activeTab === 'webtoon'
                ? 'bg-neonYellow font-bold text-black shadow-lg'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              {t('tab_mywebtoon')}
            </button>
            <button
              onClick={() => setActiveTab('premium')}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${activeTab === 'premium'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white shadow-lg'
                : 'border border-purple-500/30 text-gray-400 hover:text-white'
                }`}
            >
              {t('tab_premium')}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchImages}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              <ReloadOutlined spin={loading} />
              {t('refresh_btn')}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          {activeTab === 'image' ? (
            <p className="text-sm text-gray-400" dangerouslySetInnerHTML={{ __html: t.raw('help_mysnap') }} />
          ) : activeTab === 'webtoon' ? (
            <p className="text-sm text-gray-400" dangerouslySetInnerHTML={{ __html: t.raw('help_mywebtoon') }} />
          ) : (
            <p className="text-sm text-gray-400" dangerouslySetInnerHTML={{ __html: t.raw('help_premium') }} />
          )}
        </div>

        {/* Premium Upsell Banner in MyWebtoon tab */}
        {activeTab === 'webtoon' && images.length > 0 && (
          <div
            onClick={() => setActiveTab('premium')}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-3 transition-all hover:border-purple-500/40"
          >
            <StarFilled className="text-lg text-purple-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-300">{t('premium_upsell_title')}</p>
              <p className="text-xs text-gray-400">{t('premium_upsell_desc')}</p>
            </div>
            <span className="text-gray-500">→</span>
          </div>
        )}

        {/* Gallery Content */}
        <div key={activeTab} className="section-enter">
        {activeTab === 'premium' ? (
          // Premium Gallery with Episodes
          loadingPremium ? (
            <div className="flex justify-center py-20">
              <Spin size="large" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Episodes Section */}
              {episodes.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-medium text-gray-400">{t('episode_section_title')}</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {episodes.map((ep) => (
                      <div
                        key={ep.id}
                        onClick={() => handleViewEpisode(ep.id)}
                        className="group cursor-pointer overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-b from-purple-500/10 to-transparent transition-all hover:border-purple-500/40"
                      >
                        {ep.thumbnailUrl ? (
                          <div className="relative aspect-[3/4]">
                            <Image
                              src={ep.thumbnailUrl}
                              alt={ep.title}
                              fill
                              className="object-cover object-top"
                              sizes="(max-width: 640px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          </div>
                        ) : (
                          <div className="flex aspect-[3/4] items-center justify-center bg-gray-900">
                            <span className="text-3xl">📖</span>
                          </div>
                        )}
                        <div className="p-2">
                          <p className="truncate text-xs font-bold text-white">{ep.title}</p>
                          <p className="text-[10px] text-gray-400">
                            {t('episode_panel_count', { count: ep.panelCount })}
                            {ep.status !== 'complete' && ` · ${ep.status}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual Premium Images */}
              {premiumImages.length > 0 ? (
                <div>
                  {episodes.length > 0 && (
                    <h3 className="mb-3 text-sm font-medium text-gray-400">{t('pro_badge')}</h3>
                  )}
                  <div className="gallery-grid">
                    {premiumImages.filter((img) => !(img as any).episode_id).map((img) => (
                      <div
                        key={img.id}
                        className="webtoon-preview-card group"
                        onClick={() => {
                          setPremiumPreviewImage({
                            ...img,
                            created_at: img.createdAt,
                          } as any);
                        }}
                      >
                        <Image
                          src={img.url}
                          alt="Premium Webtoon"
                          fill
                          className="object-cover object-top"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                        <div className="webtoon-preview-blur" />
                        <div className="premium-badge rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {t('pro_badge')}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePremiumDelete(img.id);
                          }}
                          className="delete-btn flex size-6 items-center justify-center rounded-full bg-red-500/80 text-xs text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                        >
                          <DeleteOutlined />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : episodes.length === 0 ? (
                <GlassCard className="py-16 text-center">
                  <p className="mb-4 text-lg text-gray-400">{t('episode_no_episodes')}</p>
                  <p className="mb-4 text-sm text-gray-500">
                    {t('episode_no_episodes_desc')}
                  </p>
                  <button
                    onClick={() => setActiveTab('webtoon')}
                    className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-bold text-white"
                  >
                    {t('go_to_mywebtoon')}
                  </button>
                </GlassCard>
              ) : null}
            </div>
          )
        ) : loading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : images.length > 0 ? (
          <div className="space-y-6">
            {Array.from(groupImagesByDate(images)).map(([dateKey, dateImages]) => (
              <div key={dateKey}>
                {/* Date Header */}
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-sm font-medium text-gray-400">
                    {getRelativeDateLabel(dateKey)}
                  </h3>
                  <div className="h-px flex-1 bg-white/10"></div>
                  <span className="text-xs text-gray-500">{t('image_count', { count: dateImages.length })}</span>
                </div>

                {/* Images Grid */}
                <div className="gallery-grid">
                  {dateImages.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => {
                        if (isSelectionMode && activeTab === 'image') {
                          setSelectedImages((prev) =>
                            prev.includes(img.id)
                              ? prev.filter((i) => i !== img.id)
                              : [...prev, img.id]
                          );
                        } else if (activeTab === 'webtoon') {
                          setWebtoonPreviewImage(img);
                          setIsPremiumPreview(false);
                        } else {
                          setPreviewImage(img.url);
                          setViewMode('processed');
                        }
                      }}
                      onTouchStart={() => activeTab === 'image' && handleTouchStart(img.id)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchEnd}
                      onContextMenu={(e) => e.preventDefault()}
                      className={`${activeTab === 'webtoon' ? 'webtoon-preview-card' : 'gallery-item'} no-touch-callout group ${selectedImages.includes(img.id) ? 'ring-2 ring-neonYellow' : ''} ${highlightLatest && images[0]?.id === img.id
                        ? 'animate-pulse shadow-lg shadow-[#CCFF00]/30 ring-2 ring-neonYellow'
                        : ''
                        }`}
                    >
                      {activeTab === 'webtoon' ? (
                        <Image
                          src={img.url}
                          alt="Generated"
                          fill
                          className="object-cover object-top"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <Image
                          src={img.url}
                          alt="Generated"
                          width={400}
                          height={400}
                          className="gallery-thumbnail"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      )}
                      {activeTab === 'webtoon' && <div className="webtoon-preview-blur" />}

                      {activeTab === 'image' && (
                        <div
                          className={`absolute right-2 top-2 z-10 flex size-7 cursor-pointer items-center justify-center rounded-full border-2 transition-all ${selectedImages.includes(img.id)
                            ? 'scale-100 border-neonYellow bg-neonYellow opacity-100'
                            : isSelectionMode
                              ? 'scale-100 border-white/60 bg-black/40 opacity-100'
                              : 'scale-95 border-white/60 bg-black/40 opacity-0 hover:border-white hover:bg-black/60 group-hover:opacity-100'
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImages((prev) =>
                              prev.includes(img.id)
                                ? prev.filter((i) => i !== img.id)
                                : [...prev, img.id]
                            );
                          }}
                        >
                          {selectedImages.includes(img.id) && (
                            <CheckCircleFilled className="text-black" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <GlassCard className="py-20 text-center">
            <p className="mb-6 text-xl text-gray-400">
              {activeTab === 'webtoon' ? t('no_webtoons') : t('no_images')}
            </p>
            <Link
              href="/"
              className="inline-block rounded-xl bg-neonYellow px-8 py-4 text-lg font-bold text-black shadow-lg shadow-neonYellow/20 transition-all hover:scale-105 hover:bg-[#bbe600]"
            >
              {t('go_create')}
            </Link>
          </GlassCard>
        )}
        </div>

        {/* Selection Action Bar (Image Tab & Selection active) */}
        {activeTab === 'image' && selectedImages.length > 0 && (
          <div className="animate-fade-in fixed inset-x-4 bottom-[88px] z-50 mx-auto flex max-w-md items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a1a] p-3 shadow-2xl md:bottom-8 md:left-1/2 md:right-auto md:-translate-x-1/2 md:gap-4">
            <button
              onClick={() => {
                setSelectedImages([]);
                setIsSelectionMode(false);
              }}
              className="flex size-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              title={t('cancel_selection')}
            >
              ✕
            </button>
            <span className="px-2 font-bold text-white">{t('image_count', { count: selectedImages.length })}</span>
            <div className="h-6 w-px bg-white/10"></div>
            <button
              onClick={() => setWebtoonViewOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-neonYellow px-4 py-2 text-sm font-bold text-black transition-all hover:scale-105 active:scale-95"
            >
              <span>📖</span> {t('view_webtoon')}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleBulkDelete();
              }}
              className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-bold text-red-500 transition-all hover:bg-red-500/20"
            >
              <DeleteOutlined /> {t('delete_btn')}
            </button>
          </div>
        )}

        {/* Single Image Preview Modal */}
        <Modal
          open={!!previewImage}
          footer={null}
          onCancel={() => setPreviewImage(null)}
          centered
          width="90vw"
          style={{ maxWidth: '800px' }}
          styles={{
            content: {
              background: '#1a1a1a',
              padding: '0',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
            },
          }}
          closeIcon={
            <span className="mr-2 mt-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-xl text-white">
              ×
            </span>
          }
        >
          {previewImage && (
            <div className="flex flex-col">
              {/* Toggle (Only if original exists) */}
              {images.find((i) => i.url === previewImage)?.original_url && (
                <div className="flex justify-center bg-black/20 p-4">
                  <div className="flex rounded-lg bg-black/40 p-1">
                    <button
                      onClick={() => setViewMode('processed')}
                      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${viewMode === 'processed'
                        ? 'bg-white text-black shadow'
                        : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      ✨ {t('view_processed')}
                    </button>
                    <button
                      onClick={() => setViewMode('original')}
                      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${viewMode === 'original'
                        ? 'bg-white text-black shadow'
                        : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      📷 {t('view_original')}
                    </button>
                  </div>
                </div>
              )}

              <div className="relative flex min-h-[400px] items-center justify-center bg-black p-4">
                <Image
                  src={
                    (viewMode === 'original'
                      ? images.find((i) => i.url === previewImage)?.original_url || previewImage
                      : previewImage) || ''
                  }
                  alt="Preview"
                  width={1200}
                  height={1200}
                  className="max-h-[50vh] w-auto rounded-lg object-contain"
                  style={{ width: 'auto', height: 'auto' }}
                />
              </div>

              <div className="border-t border-white/10 bg-[#1a1a1a] p-4">
                {/* Primary: Story Share Button - Large and Prominent */}
                <button
                  onClick={() =>
                    handleShare(
                      viewMode === 'original'
                        ? images.find((i) => i.url === previewImage)?.original_url || previewImage
                        : previewImage
                    )
                  }
                  className="mb-3 flex w-full items-center justify-center gap-3 rounded-xl py-4 text-lg font-bold transition-all active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>📤</span>
                  {t('share_story')}
                </button>

                {/* Secondary Actions Row */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      const imgId = images.find((i) => i.url === previewImage)?.id;
                      if (imgId) {
                        handleDelete(imgId);
                        setPreviewImage(null);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <DeleteOutlined /> {t('delete_btn')}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleDownload(
                          viewMode === 'original'
                            ? images.find((i) => i.url === previewImage)?.original_url ||
                            previewImage
                            : previewImage,
                          generateTimestampedFilename('toonsnap', 'png')
                        )
                      }
                      className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2.5 text-sm text-white transition-colors hover:bg-white/20"
                    >
                      <DownloadOutlined /> {t('save_btn')}
                    </button>
                    <button
                      onClick={() =>
                        handleKakaoShare(
                          viewMode === 'original'
                            ? images.find((i) => i.url === previewImage)?.original_url ||
                            previewImage
                            : previewImage
                        )
                      }
                      className="flex items-center gap-1.5 rounded-lg bg-[#ffe812] px-3 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#ffe812]/90"
                      title={t('kakao_btn')}
                    >
                      <MessageOutlined /> {t('kakao_btn')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* 마이웹툰 전용 풀스크린 스크롤 뷰어 */}
        <Modal
          open={!!webtoonPreviewImage}
          footer={null}
          onCancel={() => setWebtoonPreviewImage(null)}
          width={600}
          centered
          style={{
            maxWidth: '95vw',
            padding: 0,
          }}
          styles={{
            content: {
              background: '#0a0a0a',
              padding: '0',
              borderRadius: '12px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
            body: {
              padding: 0,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              overflowY: 'auto', // Enable vertical scroll
            },
          }}
          closeIcon={
            <span className="absolute right-3 top-3 z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-xl text-white hover:bg-black/80">
              ×
            </span>
          }
        >
          {webtoonPreviewImage && (
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-[#1a1a1a] p-4">
                <div className="font-medium text-white">📖 {t('webtoon_viewer_title')}</div>
                <span className="text-sm text-gray-400">
                  {formatToKoreanDate(webtoonPreviewImage.createdAt || webtoonPreviewImage.created_at || 0)}
                </span>
              </div>

              {/* Scrollable Image Container */}
              <div
                ref={webtoonScrollRef}
                className="webtoon-fullscreen-scroll flex-1 overflow-y-auto"
              >
                <div className="webtoon-fullscreen-container">
                  <Image
                    src={webtoonPreviewImage.url}
                    alt="Webtoon"
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="webtoon-fullscreen-image"
                    style={{ width: '100%', height: 'auto' }}
                  />
                </div>
              </div>

              {/* Episode Creating Status Bar */}
              {(episodeCreating || convertingPremium) && (
                <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-3">
                  <div className="flex items-center justify-center gap-2 text-white">
                    <Spin size="small" />
                    <span className="text-sm font-medium">
                      {episodeCreating
                        ? t('episode_generating_story')
                        : episodeProgress.total > 0
                          ? t('episode_converting_panel', { current: episodeProgress.current, total: episodeProgress.total })
                          : t('premium_converting')}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                      style={{
                        width: episodeProgress.total > 0
                          ? `${(episodeProgress.current / episodeProgress.total) * 100}%`
                          : '60%',
                        animation: episodeProgress.total > 0 ? 'none' : 'pulse 2s infinite',
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Footer - My Snap Style */}
              <div className="border-t border-white/10 bg-[#1a1a1a] p-4">
                {/* Main Action Button - Story Share (smaller) */}
                <button
                  onClick={() => handleShare(webtoonPreviewImage.url)}
                  className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-all active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  }}
                >
                  <span>📤</span> {t('share_story')}
                </button>

                {/* Secondary Actions Row */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      if (webtoonPreviewImage) {
                        isPremiumPreview
                          ? handlePremiumDelete(webtoonPreviewImage.id)
                          : handleDelete(webtoonPreviewImage.id);
                        setWebtoonPreviewImage(null);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    <DeleteOutlined /> {t('delete_btn')}
                  </button>

                  <div className="flex gap-2">
                    {/* Episode Create Button - Only for non-premium webtoons */}
                    {!isPremiumPreview && (
                      <button
                        onClick={handleCreateEpisode}
                        disabled={episodeCreating || convertingPremium}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/40 active:scale-95 disabled:opacity-50"
                      >
                        <StarFilled /> {t('create_episode')}
                      </button>
                    )}
                    <button
                      onClick={() =>
                        handleDownload(
                          webtoonPreviewImage.url,
                          generateTimestampedFilename('webtoon', 'jpg')
                        )
                      }
                      className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
                    >
                      <DownloadOutlined /> {t('save_btn')}
                    </button>
                    <button
                      onClick={() => handleKakaoShare(webtoonPreviewImage.url)}
                      className="flex items-center gap-1.5 rounded-lg bg-[#ffe812] px-3 py-2 text-sm font-bold text-black hover:bg-[#ffe812]/90"
                    >
                      <MessageOutlined /> {t('kakao_btn')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* 프리미엄 전용 뷰어 (마이웹툰과 분리) */}
        <Modal
          open={!!premiumPreviewImage}
          footer={null}
          onCancel={() => setPremiumPreviewImage(null)}
          width={600}
          centered
          style={{
            maxWidth: '95vw',
            padding: 0,
          }}
          styles={{
            content: {
              background: '#0a0a0a',
              padding: '0',
              borderRadius: '12px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
            body: {
              padding: 0,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              overflowY: 'auto',
            },
          }}
          closeIcon={
            <span className="absolute right-3 top-3 z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-xl text-white hover:bg-black/80">
              ×
            </span>
          }
          afterOpenChange={(open) => {
            if (open && premiumScrollRef.current) {
              premiumScrollRef.current.scrollTo({
                top: 0,
                behavior: 'instant',
              });
            }
          }}
        >
          {premiumPreviewImage && (
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4">
                <div className="flex items-center gap-2 font-medium text-white">
                  ✨{' '}
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-bold text-transparent">
                    {t('premium_viewer_title')}
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  {formatToKoreanDate(premiumPreviewImage.createdAt || premiumPreviewImage.created_at || 0)}
                </span>
              </div>

              {/* Scrollable Image Container */}
              <div
                ref={premiumScrollRef}
                className="webtoon-fullscreen-scroll flex-1 overflow-y-auto"
              >
                <div className="webtoon-fullscreen-container">
                  <Image
                    src={premiumPreviewImage.url}
                    alt="Premium Webtoon"
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="webtoon-fullscreen-image"
                    style={{ width: '100%', height: 'auto' }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 bg-[#1a1a1a] p-4">
                <button
                  onClick={() => handleShare(premiumPreviewImage.url)}
                  className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-all active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                  }}
                >
                  <span>📤</span> {t('share_story')}
                </button>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      if (premiumPreviewImage) {
                        handlePremiumDelete(premiumPreviewImage.id);
                        setPremiumPreviewImage(null);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    <DeleteOutlined /> {t('delete_btn')}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleDownload(
                          premiumPreviewImage.url,
                          generateTimestampedFilename('premium', 'jpg')
                        )
                      }
                      className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
                    >
                      <DownloadOutlined /> {t('save_btn')}
                    </button>
                    <button
                      onClick={() => handleKakaoShare(premiumPreviewImage.url)}
                      className="flex items-center gap-1.5 rounded-lg bg-[#ffe812] px-3 py-2 text-sm font-bold text-black hover:bg-[#ffe812]/90"
                    >
                      <MessageOutlined /> {t('kakao_btn')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Webtoon Strip View Modal */}
        <Modal
          open={webtoonViewOpen}
          footer={null}
          onCancel={() => {
            setWebtoonViewOpen(false);
            setPanelLayouts([]);
            setSmartLayoutEnabled(false);
          }}
          centered
          width="95vw"
          style={{ maxWidth: '650px' }}
          styles={{
            content: {
              background: smartLayoutEnabled ? '#0a0a0a' : '#fff',
              padding: '0',
              borderRadius: '12px',
              overflow: 'visible',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
          closeIcon={
            <span
              className={`fixed right-4 top-4 z-50 cursor-pointer rounded-full p-2 text-xl shadow-lg ${smartLayoutEnabled ? 'bg-black/50 text-white' : 'bg-white text-black'}`}
            >
              ×
            </span>
          }
        >
          {/* Smart Layout Toggle Header */}
          <div
            className={`flex items-center justify-between border-b p-3 ${smartLayoutEnabled ? 'border-white/10 bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}
          >
            <span
              className={`text-sm font-medium ${smartLayoutEnabled ? 'text-white' : 'text-gray-700'}`}
            >
              {t('cuts_connected', { count: selectedImages.length })}
            </span>
            <button
              onClick={async () => {
                if (!smartLayoutEnabled) {
                  // Analyze layout
                  setAnalyzingLayout(true);
                  try {
                    const selectedImgs = images
                      .filter((img) => selectedImages.includes(img.id))
                      .sort((a, b) => selectedImages.indexOf(a.id) - selectedImages.indexOf(b.id))
                      .map((img) => img.url);

                    const res = await fetch('/api/ai/analyze-layout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ images: selectedImgs }),
                    });

                    const data = await res.json();
                    console.log('[SmartLayout] API Response:', data);

                    if (data.success && data.layouts) {
                      setPanelLayouts(data.layouts);
                      setSmartLayoutEnabled(true);
                    } else {
                      console.error('[SmartLayout] Failed:', data);
                      message.error(data.error || t('layout_fail'));
                    }
                  } catch (err) {
                    console.error(err);
                    message.error(t('layout_error'));
                  } finally {
                    setAnalyzingLayout(false);
                  }
                } else {
                  setSmartLayoutEnabled(false);
                  setPanelLayouts([]);
                }
              }}
              disabled={analyzingLayout}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${smartLayoutEnabled
                ? 'bg-neonYellow text-black'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {analyzingLayout ? (
                <>
                  <Spin size="small" /> {t('analyzing_layout')}
                </>
              ) : (
                <>✨ {t('smart_layout')} {smartLayoutEnabled ? 'ON' : 'OFF'}</>
              )}
            </button>
          </div>

          {/* Content Area */}
          <div
            className={`webtoon-scroll-container relative flex-1 overflow-y-auto p-0 ${smartLayoutEnabled ? 'bg-[#0a0a0a]' : 'bg-gray-100'}`}
          >
            {smartLayoutEnabled && panelLayouts.length > 0 ? (
              <WebtoonViewer
                images={images
                  .filter((img) => selectedImages.includes(img.id))
                  .sort((a, b) => selectedImages.indexOf(a.id) - selectedImages.indexOf(b.id))
                  .map((img) => img.url)}
                layouts={panelLayouts}
              />
            ) : (
              images
                .filter((img) => selectedImages.includes(img.id))
                .sort((a, b) => selectedImages.indexOf(a.id) - selectedImages.indexOf(b.id))
                .map((img) => (
                  <Image
                    key={img.id}
                    src={img.url}
                    alt="Webtoon frame"
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="block h-auto w-full"
                    style={{ width: '100%', height: 'auto' }}
                  />
                ))
            )}
          </div>

          {/* Footer */}
          <div
            className={`z-10 flex items-center justify-end gap-3 border-t p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] ${smartLayoutEnabled ? 'border-white/10 bg-[#1a1a1a]' : 'border-gray-200 bg-white'}`}
          >
            <button
              onClick={() => {
                setWebtoonViewOpen(false);
                setPanelLayouts([]);
                setSmartLayoutEnabled(false);
              }}
              className={`rounded-xl px-5 py-2.5 font-medium transition-colors ${smartLayoutEnabled ? 'text-gray-400 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {t('close_btn')}
            </button>
            <button
              onClick={handleWebtoonSave}
              disabled={savingWebtoon}
              className="flex items-center gap-2 rounded-xl bg-neonYellow px-6 py-2.5 font-bold text-black shadow-lg transition-all hover:bg-[#bbe600] hover:shadow-xl active:scale-95"
            >
              {savingWebtoon ? <Spin size="small" /> : <DownloadOutlined />}
              {t('save_to_mywebtoon')}
            </button>
          </div>
        </Modal>

        {/* 변환 결과 팝업 모달 */}
        <Modal
          open={showResultModal}
          onCancel={() => setShowResultModal(false)}
          footer={null}
          centered
          width={400}
          className="result-modal"
          styles={{
            content: {
              background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: 0,
              overflow: 'hidden',
            },
            mask: {
              backdropFilter: 'blur(8px)',
            },
          }}
        >
          <div className="p-6 text-center">
            {/* Success Icon */}
            <div className="mb-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#CCFF00] to-[#88cc00] shadow-lg shadow-[#CCFF00]/30">
                <CheckCircleFilled className="text-3xl text-black" />
              </div>
            </div>

            {/* Title */}
            <h3 className="mb-2 text-xl font-bold text-white">✨ {t('result_title')}</h3>
            <p className="mb-6 text-sm text-gray-400">
              {activeTab === 'webtoon'
                ? t('result_webtoon_desc')
                : t('result_image_desc')}
            </p>

            {/* Preview of latest image */}
            {((activeTab === 'webtoon' && images.length > 0) ||
              (activeTab === 'image' && images.length > 0)) && (
                <div className="mb-6 overflow-hidden rounded-xl border border-white/10 shadow-lg">
                  <Image
                    src={images[0]?.url}
                    alt="Result"
                    width={500}
                    height={300}
                    className="max-h-48 w-full object-cover"
                  />
                </div>
              )}

            {/* Episode 유도 (웹툰 탭일 때만) */}
            {activeTab === 'webtoon' && (
              <div className="mb-4 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <StarFilled className="text-purple-400" />
                  <span className="text-sm font-semibold text-purple-400">{t('premium_label')}</span>
                </div>
                <p className="text-xs text-gray-400">
                  {t('premium_upgrade_hint')}
                  <br />
                  {t('premium_upgrade_desc')}
                </p>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={() => {
                setShowResultModal(false);
                setHighlightLatest(true);
                setTimeout(() => setHighlightLatest(false), 5000);
              }}
              className="w-full rounded-xl bg-neonYellow py-3 font-bold text-black transition-all hover:bg-[#bbe600] active:scale-95"
            >
              {t('confirm_btn')}
            </button>
          </div>
        </Modal>

        {/* Story Preview Modal */}
        <Modal
          open={showStoryPreview}
          onCancel={() => setShowStoryPreview(false)}
          footer={null}
          centered
          width={500}
          styles={{
            content: {
              background: '#1a1a1a',
              padding: '0',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          }}
          closeIcon={
            <span className="mr-2 mt-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-xl text-white">
              ×
            </span>
          }
        >
          {episodeStory && (
            <div className="flex flex-col overflow-hidden">
              <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4">
                <h3 className="text-lg font-bold text-white">{t('episode_story_title')}</h3>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4" style={{ maxHeight: '60vh' }}>
                {/* Title & Synopsis */}
                <div>
                  <h4 className="text-base font-bold text-white">{episodeStory.title}</h4>
                  <p className="mt-1 text-sm text-gray-400">{episodeStory.synopsis}</p>
                </div>

                {/* Panel List */}
                <div className="space-y-3">
                  {episodeStory.panels.map((panel, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                          {i + 1}
                        </span>
                        <span className="text-xs text-gray-500">{panel.cameraDirection} · {panel.emotion}</span>
                      </div>
                      {panel.dialogue && (
                        <p className="text-sm text-white">
                          <span className="mr-1 text-xs text-gray-500">{t('episode_panel_dialogue')}:</span>
                          &ldquo;{panel.dialogue}&rdquo;
                        </p>
                      )}
                      {panel.narration && (
                        <p className="text-xs italic text-gray-400">
                          <span className="mr-1 not-italic text-gray-500">{t('episode_panel_narration')}:</span>
                          {panel.narration}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 bg-[#1a1a1a] p-4">
                <button
                  onClick={handleGenerateEpisode}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                >
                  <StarFilled /> {t('episode_confirm_generate')}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Episode Viewer Modal */}
        <Modal
          open={showEpisodeViewer}
          onCancel={() => {
            setShowEpisodeViewer(false);
            setCurrentEpisode(null);
          }}
          footer={null}
          width={600}
          centered
          style={{ maxWidth: '95vw', padding: 0 }}
          styles={{
            content: {
              background: '#0a0a0a',
              padding: '0',
              borderRadius: '12px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
            body: {
              padding: 0,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              overflowY: 'auto',
            },
          }}
          closeIcon={
            <span className="absolute right-3 top-3 z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-xl text-white hover:bg-black/80">
              ×
            </span>
          }
        >
          {currentEpisode && (
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-y-auto">
                <EpisodeViewer
                  title={currentEpisode.title}
                  synopsis={currentEpisode.synopsis}
                  panels={currentEpisode.panels}
                  editable={true}
                  onUpdateDialogue={async (panelIndex, dialogue) => {
                    if (!currentEpisode) return;
                    const updatedPanels = [...currentEpisode.panels];
                    updatedPanels[panelIndex] = { ...updatedPanels[panelIndex], dialogue };
                    setCurrentEpisode({ ...currentEpisode, panels: updatedPanels });

                    // Save to server
                    const currentUserId = localStorage.getItem('toonsnap_user_id');
                    const storyData = {
                      title: currentEpisode.title,
                      synopsis: currentEpisode.synopsis,
                      panels: updatedPanels.map((p: any) => ({
                        panelIndex: p.panelIndex,
                        dialogue: p.dialogue,
                        narration: p.narration,
                        bubbleStyle: p.bubbleStyle,
                        cameraDirection: p.cameraDirection,
                        emotion: p.emotion,
                        sceneDescription: p.sceneDescription,
                      })),
                    };
                    try {
                      await fetch(`/api/premium/episode/${currentEpisode.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUserId, storyData }),
                      });
                    } catch { /* best effort */ }
                  }}
                />
              </div>
              <div className="border-t border-white/10 bg-[#1a1a1a] p-3">
                <button
                  onClick={() => {
                    setShowEpisodeViewer(false);
                    setCurrentEpisode(null);
                  }}
                  className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  {t('close_btn')}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </main>
  );
}

// Suspense boundary for useSearchParams
export default function GalleryPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4 md:p-8">
          <Spin size="large" />
        </main>
      }
    >
      <GalleryContent />
    </Suspense>
  );
}
