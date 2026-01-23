'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Spin, Modal, message } from 'antd';
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
import GlassCard from '../../components/GlassCard';
import WebtoonViewer from '../../components/WebtoonViewer';
import type { PanelLayout, KakaoSDK } from '../../types';
import { formatToKoreanDate, getRelativeDateLabel } from '../../utils/dateUtils';
import { downloadFile, generateTimestampedFilename } from '../../utils/fileUtils';
import { generateUUID, delay } from '../../utils/commonUtils';

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
    created_at: number;
    createdAt?: number; // API returns this
}

// Helper function to group images by date
const groupImagesByDate = (images: GalleryImage[]): Map<string, GalleryImage[]> => {
    const groups = new Map<string, GalleryImage[]>();

    images.forEach((img) => {
        const timestamp = img.createdAt || img.created_at;
        const dateKey = formatToKoreanDate(timestamp);

        if (!groups.has(dateKey)) {
            groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(img);
    });

    return groups;
};

function GalleryContent() {
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
            router.replace('/gallery' + (tab ? `?tab=${tab}` : ''), {
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
            message.success('이미지 주소가 복사되었습니다!');
        } catch (err) {
            message.error('공유하기를 지원하지 않는 환경입니다.');
        }
    };

    const handleKakaoShare = (imageUrl: string) => {
        if (typeof window === 'undefined' || !window.Kakao) {
            message.error('카카오 SDK가 로드되지 않았습니다.');
            return;
        }

        if (!window.Kakao.isInitialized()) {
            message.error('카카오 키 설정이 필요합니다.');
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
                title: 'BanaToon 웹툰 변환',
                description: '친구가 만든 웹툰 스타일 이미지를 확인해보세요!',
                imageUrl: absoluteImageUrl,
                link: {
                    mobileWebUrl: shareLink,
                    webUrl: shareLink,
                },
            },
            buttons: [
                {
                    title: '이미지 보기',
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
            const errorMessage = err instanceof Error ? err.message : '갤러리를 불러오는데 실패했습니다.';
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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, userId]);

    // Premium Conversion
    const handlePremiumConvert = async () => {
        if (!webtoonPreviewImage) return;
        setConvertingPremium(true);

        try {
            const currentUserId = localStorage.getItem('toonsnap_user_id');

            // Convert image URL to Base64 Data URI
            const imageUrl = webtoonPreviewImage.url;
            const response = await fetch(imageUrl);
            const blob = await response.blob();

            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            const res = await fetch('/api/premium/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: base64, // Now sending Base64 Data URI
                    sourceWebtoonId: webtoonPreviewImage.id,
                    userId: currentUserId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || data.error || 'Conversion failed');
            }

            message.success('프리미엄 변환 완료! 프리미엄 탭에서 확인하세요.');
            setWebtoonPreviewImage(null);
            setActiveTab('premium');
            fetchPremiumImages();
        } catch (err) {
            console.error('Premium conversion error:', err);
            const errorMessage = err instanceof Error ? err.message : '프리미엄 변환에 실패했습니다.';
            message.error(errorMessage);
        } finally {
            setConvertingPremium(false);
        }
    };

    // Delete Premium Image
    const handlePremiumDelete = async (imageId: string) => {
        if (!window.confirm('이 프리미엄 이미지를 삭제하시겠습니까?')) return;

        try {
            const res = await fetch(`/api/premium/gallery?id=${imageId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Delete failed');

            setPremiumImages((prev) => prev.filter((img) => img.id !== imageId));
            message.success('삭제되었습니다.');
        } catch (err) {
            message.error('삭제에 실패했습니다.');
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
                throw new Error('이미지가 너무 깁니다. 선택한 이미지 수를 줄여주세요.');
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
                throw new Error('이미지 생성에 실패했습니다. 메모리가 부족할 수 있습니다.');
            }

            // 5. Save to Server
            const userId = localStorage.getItem('toonsnap_user_id');
            if (userId) {
                const res = await fetch('/api/webtoon/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: webtoonDataUrl, userId }),
                });

                if (!res.ok) {
                    throw new Error('서버 저장에 실패했습니다.');
                }

                message.success('마이웹툰에 저장되었습니다!');
                setActiveTab('webtoon');
                setWebtoonViewOpen(false);
                setSelectedImages([]);
                setIsSelectionMode(false);
            }
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : '웹툰 저장에 실패했습니다.';
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
        if (!window.confirm('이 이미지를 삭제하시겠습니까?')) {
            return;
        }

        setDeleting(imageId);
        try {
            const res = await fetch(`/api/gallery/${imageId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || 'Failed to delete');
            }

            setImages((prev) => prev.filter((img) => img.id !== imageId));
            message.success('이미지가 삭제되었습니다.');
            // If deleting via modal, close it
            if (previewImage) setPreviewImage(null);
        } catch (err: any) {
            console.error(err);
            message.error(err.message || '삭제에 실패했습니다.');
        } finally {
            setDeleting(null);
        }
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            await downloadFile(url, filename);
        } catch (err) {
            message.error('다운로드에 실패했습니다.');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedImages.length === 0) return;

        if (!window.confirm(`선택한 ${selectedImages.length}장의 이미지를 삭제하시겠습니까?`)) {
            return;
        }

        setDeleting('bulk');
        try {
            const results = await Promise.all(
                selectedImages.map((id) =>
                    fetch(`/api/gallery/${id}`, {
                        method: 'DELETE',
                    }).then((res) => ({ id, ok: res.ok }))
                )
            );

            const failed = results.filter((r) => !r.ok);
            if (failed.length > 0) {
                console.error('Failed to delete some images:', failed);
                message.warning(`${failed.length}장의 이미지를 삭제하지 못했습니다.`);
            }

            const successfulIds = results.filter((r) => r.ok).map((r) => r.id);
            setImages((prev) => prev.filter((img) => !successfulIds.includes(img.id)));
            setSelectedImages((prev) => prev.filter((id) => !successfulIds.includes(id)));

            if (failed.length === 0) {
                message.success('삭제되었습니다.');
            }
        } catch (err) {
            console.error(err);
            message.error('삭제 중 오류가 발생했습니다.');
        } finally {
            setDeleting(null);
            setIsSelectionMode(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
            <div className="mx-auto max-w-2xl space-y-6">
                {/* Header */}
                <div className="animate-fade-in flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-gray-400 transition-colors hover:text-white">
                            ← 홈
                        </Link>
                        <h1 className="text-2xl font-bold text-white">
                            My <span className="text-neonYellow">Gallery</span>
                        </h1>
                    </div>

                    {/* Tabs */}
                    <div className="order-last flex w-full justify-center rounded-lg bg-white/10 p-1 md:order-none md:w-auto">
                        <button
                            onClick={() => setActiveTab('image')}
                            className={`rounded-md px-3 py-2 text-sm transition-all ${activeTab === 'image'
                                    ? 'bg-neonYellow font-bold text-black shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            🖼️ 마이스냅
                        </button>
                        <button
                            onClick={() => setActiveTab('webtoon')}
                            className={`rounded-md px-3 py-2 text-sm transition-all ${activeTab === 'webtoon'
                                    ? 'bg-neonYellow font-bold text-black shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            📖 마이웹툰
                        </button>
                        <button
                            onClick={() => setActiveTab('premium')}
                            className={`rounded-md px-3 py-2 text-sm transition-all ${activeTab === 'premium'
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            ✨ 프리미엄
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={fetchImages}
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                        >
                            <ReloadOutlined spin={loading} />
                            새로고침
                        </button>
                    </div>
                </div>

                {/* Help Text */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    {activeTab === 'image' ? (
                        <p className="text-sm text-gray-400">
                            💡 <strong className="text-white">마이스냅:</strong> 변환된 이미지가 여기에
                            저장됩니다.
                            <br />
                            <span className="text-gray-500">
                                • 이미지를 길게 눌러 선택 → <strong className="text-neonYellow">웹툰 보기</strong>로
                                합쳐보세요!
                                <br />• 클릭하면 크게 보고 다운로드/공유할 수 있습니다.
                            </span>
                        </p>
                    ) : activeTab === 'webtoon' ? (
                        <p className="text-sm text-gray-400">
                            💡 <strong className="text-white">마이웹툰:</strong> 여러 이미지를 합쳐 만든 웹툰이
                            저장됩니다.
                            <br />
                            <span className="text-gray-500">
                                • 웹툰 이미지를 클릭 → <strong className="text-purple-400">프리미엄 변환</strong>
                                으로 고퀄리티 업그레이드!
                            </span>
                        </p>
                    ) : (
                        <p className="text-sm text-gray-400">
                            ✨ <strong className="text-white">프리미엄:</strong> AI로 고퀄리티 변환된 웹툰이
                            저장됩니다.
                            <br />
                            <span className="text-gray-500">• 800×1280px 시네마틱 프리미엄 웹툰 형식</span>
                        </p>
                    )}
                </div>

                {/* Gallery Content */}
                {activeTab === 'premium' ? (
                    // Premium Gallery
                    loadingPremium ? (
                        <div className="flex justify-center py-20">
                            <Spin size="large" />
                        </div>
                    ) : premiumImages.length > 0 ? (
                        <div className="gallery-grid">
                            {premiumImages.map((img) => (
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
                                    {/* Premium Badge */}
                                    <div className="premium-badge rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                        ✨ PRO
                                    </div>
                                    {/* Delete Button */}
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
                    ) : (
                        <GlassCard className="py-16 text-center">
                            <p className="mb-4 text-lg text-gray-400">아직 프리미엄 변환된 웹툰이 없습니다.</p>
                            <p className="mb-4 text-sm text-gray-500">
                                마이웹툰에서 이미지를 선택하고 &quot;프리미엄 변환&quot; 버튼을 눌러보세요!
                            </p>
                            <button
                                onClick={() => setActiveTab('webtoon')}
                                className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-bold text-white"
                            >
                                📖 마이웹툰으로 이동
                            </button>
                        </GlassCard>
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
                                    <span className="text-xs text-gray-500">{dateImages.length}장</span>
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
                                                        <CheckCircleFilled className="text-sm text-black" />
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
                    <GlassCard className="py-16 text-center">
                        <p className="mb-4 text-lg text-gray-400">
                            {activeTab === 'image' ? '아직 변환된 이미지가 없습니다.' : '저장된 웹툰이 없습니다.'}
                        </p>
                        <Link href="/">
                            <button className="accent-btn">✨ 작품 만들러 가기</button>
                        </Link>
                        <p className="mt-4 text-xs text-gray-600">User ID: {userId?.slice(0, 8)}...</p>
                    </GlassCard>
                )}

                {/* Selection Action Bar (Image Tab & Selection active) */}
                {activeTab === 'image' && selectedImages.length > 0 && (
                    <div className="animate-fade-in fixed inset-x-4 bottom-8 z-50 mx-auto flex max-w-md items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a1a] p-3 shadow-2xl md:left-1/2 md:right-auto md:-translate-x-1/2 md:gap-4">
                        <button
                            onClick={() => {
                                setSelectedImages([]);
                                setIsSelectionMode(false);
                            }}
                            className="flex size-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                            title="선택 취소"
                        >
                            ✕
                        </button>
                        <span className="px-2 font-bold text-white">{selectedImages.length}장</span>
                        <div className="h-6 w-px bg-white/10"></div>
                        <button
                            onClick={() => setWebtoonViewOpen(true)}
                            className="flex items-center gap-2 rounded-xl bg-neonYellow px-4 py-2 text-sm font-bold text-black transition-all hover:scale-105 active:scale-95"
                        >
                            <span>📖</span> 웹툰 보기
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBulkDelete();
                            }}
                            className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-bold text-red-500 transition-all hover:bg-red-500/20"
                        >
                            <DeleteOutlined /> 삭제
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
                                            ✨ 변환본
                                        </button>
                                        <button
                                            onClick={() => setViewMode('original')}
                                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${viewMode === 'original'
                                                    ? 'bg-white text-black shadow'
                                                    : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            📷 원본
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
                                    스토리에 공유하기
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
                                        <DeleteOutlined /> 삭제
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
                                            <DownloadOutlined /> 저장
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
                                            title="카카오톡 공유"
                                        >
                                            <MessageOutlined /> 카카오
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
                                <div className="font-medium text-white">📖 마이웹툰 뷰어</div>
                                <span className="text-sm text-gray-400">
                                    {new Date(
                                        (webtoonPreviewImage.createdAt || webtoonPreviewImage.created_at) * 1000
                                    ).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
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

                            {/* Converting Status Bar */}
                            {convertingPremium && (
                                <div className="border-b border-white/10 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-3">
                                    <div className="flex items-center justify-center gap-2 text-white">
                                        <Spin size="small" />
                                        <span className="text-sm font-medium">프리미엄 변환 중...</span>
                                    </div>
                                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20">
                                        <div
                                            className="h-full animate-pulse bg-gradient-to-r from-purple-500 to-pink-500"
                                            style={{ width: '60%' }}
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
                                    <span>📤</span> 스토리에 공유하기
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
                                        <DeleteOutlined /> 삭제
                                    </button>

                                    <div className="flex gap-2">
                                        {/* Premium Button - Only for non-premium */}
                                        {!isPremiumPreview && (
                                            <button
                                                onClick={handlePremiumConvert}
                                                disabled={convertingPremium}
                                                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/40 active:scale-95 disabled:opacity-50"
                                            >
                                                <StarFilled /> 프리미엄 변환
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
                                            <DownloadOutlined /> 저장
                                        </button>
                                        <button
                                            onClick={() => handleKakaoShare(webtoonPreviewImage.url)}
                                            className="flex items-center gap-1.5 rounded-lg bg-[#ffe812] px-3 py-2 text-sm font-bold text-black hover:bg-[#ffe812]/90"
                                        >
                                            <MessageOutlined /> 카카오
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
                                        프리미엄 뷰어
                                    </span>
                                </div>
                                <span className="text-sm text-gray-400">
                                    {new Date(
                                        (premiumPreviewImage.createdAt || premiumPreviewImage.created_at) * 1000
                                    ).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
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
                                    <span>📤</span> 스토리에 공유하기
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
                                        <DeleteOutlined /> 삭제
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
                                            <DownloadOutlined /> 저장
                                        </button>
                                        <button
                                            onClick={() => handleKakaoShare(premiumPreviewImage.url)}
                                            className="flex items-center gap-1.5 rounded-lg bg-[#ffe812] px-3 py-2 text-sm font-bold text-black hover:bg-[#ffe812]/90"
                                        >
                                            <MessageOutlined /> 카카오
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
                    width="650px"
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
                            {selectedImages.length}컷 연결됨
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
                                            message.error(data.error || '레이아웃 분석에 실패했습니다.');
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        message.error('레이아웃 분석 중 오류가 발생했습니다.');
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
                                    <Spin size="small" /> 분석중...
                                </>
                            ) : (
                                <>✨ 스마트 레이아웃 {smartLayoutEnabled ? 'ON' : 'OFF'}</>
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
                            닫기
                        </button>
                        <button
                            onClick={handleWebtoonSave}
                            disabled={savingWebtoon}
                            className="flex items-center gap-2 rounded-xl bg-neonYellow px-6 py-2.5 font-bold text-black shadow-lg transition-all hover:bg-[#bbe600] hover:shadow-xl active:scale-95"
                        >
                            {savingWebtoon ? <Spin size="small" /> : <DownloadOutlined />}
                            마이웹툰에 저장
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
                        <h3 className="mb-2 text-xl font-bold text-white">✨ 변환 완료!</h3>
                        <p className="mb-6 text-sm text-gray-400">
                            {activeTab === 'webtoon'
                                ? '웹툰이 성공적으로 저장되었습니다.'
                                : '사진이 성공적으로 변환되었습니다.'}
                        </p>

                        {/* Preview of latest image */}
                        {((activeTab === 'webtoon' && images.length > 0) ||
                            (activeTab === 'image' && images.length > 0)) && (
                                <div className="mb-6 overflow-hidden rounded-xl border border-white/10 shadow-lg">
                                    <Image
                                        src={images[0]?.url}
                                        alt="변환 결과"
                                        width={500}
                                        height={300}
                                        className="max-h-48 w-full object-cover"
                                    />
                                </div>
                            )}

                        {/* Premium 유도 (웹툰 탭일 때만) */}
                        {activeTab === 'webtoon' && (
                            <div className="mb-4 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                                <div className="mb-2 flex items-center justify-center gap-2">
                                    <StarFilled className="text-purple-400" />
                                    <span className="text-sm font-semibold text-purple-400">프리미엄 변환</span>
                                </div>
                                <p className="text-xs text-gray-400">
                                    더 고퀄리티 웹툰으로 업그레이드해보세요!
                                    <br />
                                    이미지를 클릭하면 프리미엄 변환이 가능합니다.
                                </p>
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            onClick={() => {
                                setShowResultModal(false);
                                setHighlightLatest(true);
                                // 5초 후 하이라이트 자동 해제
                                setTimeout(() => setHighlightLatest(false), 5000);
                            }}
                            className="w-full rounded-xl bg-neonYellow py-3 font-bold text-black transition-all hover:bg-[#bbe600] active:scale-95"
                        >
                            확인하기
                        </button>
                    </div>
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

