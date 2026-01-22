'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Spin, Modal, message } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined, CheckCircleFilled, DownloadOutlined, ShareAltOutlined, MessageOutlined, StarFilled } from '@ant-design/icons';

import Link from 'next/link';
import GlassCard from '../../components/GlassCard';
import WebtoonViewer from '../../components/WebtoonViewer';
import type { PanelLayout } from '../../types/layout';

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

    images.forEach(img => {
        const timestamp = img.createdAt || img.created_at;
        const date = new Date(timestamp * 1000);
        const dateKey = date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        if (!groups.has(dateKey)) {
            groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(img);
    });

    return groups;
};

// Helper to get relative date label
const getRelativeDateLabel = (dateStr: string): string => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    if (dateStr === todayStr) return '?�늘';
    if (dateStr === yesterdayStr) return '?�제';
    return dateStr;
};

function GalleryContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'image' | 'webtoon' | 'premium'>('image');
    const [savingWebtoon, setSavingWebtoon] = useState(false);
    const [viewMode, setViewMode] = useState<'processed' | 'original'>('processed');

    // 결과 ?�업 ?�태 (URL?�서 showResult=true?????�시)
    const [showResultModal, setShowResultModal] = useState(false);
    const [latestResult, setLatestResult] = useState<GalleryImage | null>(null);
    // 최신 ?��?지 ?�이?�이??(?�업 ?��? ???�시)
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
    const [isPremiumPreview, setIsPremiumPreview] = useState(false);  // ?�리미엄 ?��?지 ?��?
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
            setSelectedImages(prev => prev.includes(imgId) ? prev : [...prev, imgId]);
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
            const newUserId = crypto.randomUUID();
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
            // URL?�서 쿼리 ?�라미터 ?�거 (?�스?�리 ?�리)
            router.replace('/gallery' + (tab ? `?tab=${tab}` : ''), { scroll: false });
        }
    }, [searchParams, router]);

    // Initialize Kakao SDK
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).Kakao) {
            if (!(window as any).Kakao.isInitialized()) {
                // REPLACE WITH YOUR ACTUAL KAKAO JAVASCRIPT KEY
                (window as any).Kakao.init(process.env.NEXT_PUBLIC_KAKAO_API_KEY);
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
                    files: [file]
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
            message.success('?��?지 주소가 복사?�었?�니??');
        } catch (err) {
            message.error('공유?�기�?지?�하지 ?�는 ?�경?�니??');
        }
    };

    const handleKakaoShare = (imageUrl: string) => {
        if (typeof window === 'undefined' || !(window as any).Kakao) {
            message.error('카카??SDK가 로드?��? ?�았?�니??');
            return;
        }

        if (!(window as any).Kakao.isInitialized()) {
            message.error('카카?????�정???�요?�니??');
            return;
        }

        // Convert relative URL to absolute URL (Required for Kakao)
        // Ensure we use the PRODUCTION domain for both Image and Link, 
        // because Kakao cannot access Localhost images/links.
        const productionOrigin = 'https://banatoon.app';

        // Force Production URL always to match Kakao Developers settings
        const targetOrigin = productionOrigin;

        const absoluteImageUrl = new URL(imageUrl, targetOrigin).toString();

        // 공유 ?�용 ?�이지 - 받는 ?�람???��?지�?�????�음
        const shareLink = new URL(`/share?image=${encodeURIComponent(absoluteImageUrl)}`, targetOrigin).toString();

        (window as any).Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
                title: 'BanaToon ?�툰 변??,
                description: '친구가 만든 ?�툰 ?��????��?지�??�인?�보?�요!',
                imageUrl: absoluteImageUrl,
                link: {
                    mobileWebUrl: shareLink,
                    webUrl: shareLink,
                },
            },
            buttons: [
                {
                    title: '?��?지 보기',
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
        } catch (err: any) {
            console.error('Fetch Error:', err);
            message.error(err.message || '갤러리�? 불러?�는???�패?�습?�다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchImages();
        }
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
                    image: base64,  // Now sending Base64 Data URI
                    sourceWebtoonId: webtoonPreviewImage.id,
                    userId: currentUserId
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || data.error || 'Conversion failed');
            }

            message.success('?�리미엄 변???�료! ?�리미엄 ??��???�인?�세??');
            setWebtoonPreviewImage(null);
            setActiveTab('premium');
            fetchPremiumImages();

        } catch (err: any) {
            console.error('Premium conversion error:', err);
            message.error(err.message || '?�리미엄 변?�에 ?�패?�습?�다.');
        } finally {
            setConvertingPremium(false);
        }
    };

    // Delete Premium Image
    const handlePremiumDelete = async (imageId: string) => {
        if (!window.confirm('???�리미엄 ?��?지�???��?�시겠습?�까?')) return;

        try {
            const res = await fetch(`/api/premium/gallery?id=${imageId}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Delete failed');

            setPremiumImages(prev => prev.filter(img => img.id !== imageId));
            message.success('??��?�었?�니??');
        } catch (err) {
            message.error('??��???�패?�습?�다.');
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
                .filter(img => selectedImages.includes(img.id))
                .sort((a, b) => selectedImages.indexOf(a.id) - selectedImages.indexOf(b.id));

            // Helper to load a single image
            const loadImage = (url: string): Promise<HTMLImageElement> => {
                return new Promise((resolve, reject) => {
                    const img = new window.Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error('?��?지 로드 ?�패'));
                    img.src = url;
                });
            };

            // 2. Phase 1: Calculate dimensions (load once, get sizes, release)
            const dimensions: { url: string; width: number; height: number; scaledHeight: number }[] = [];
            let maxWidth = 0;

            for (const imgData of sortedSelectedImages) {
                const img = await loadImage(imgData.url);
                if (img.width > maxWidth) maxWidth = img.width;
                dimensions.push({ url: imgData.url, width: img.width, height: img.height, scaledHeight: 0 });
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
                throw new Error('?��?지가 ?�무 깁니?? ?�택???��?지 ?��? 줄여주세??');
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
                await new Promise(r => setTimeout(r, 10));
            }

            // 4. Convert to Data URL with lower quality for mobile
            const webtoonDataUrl = canvas.toDataURL('image/jpeg', 0.80);

            // Validate result
            if (!webtoonDataUrl || webtoonDataUrl === 'data:,' || webtoonDataUrl.length < 1000) {
                throw new Error('?��?지 ?�성???�패?�습?�다. 메모리�? 부족할 ???�습?�다.');
            }

            // 5. Save to Server
            const userId = localStorage.getItem('toonsnap_user_id');
            if (userId) {
                const res = await fetch('/api/webtoon/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: webtoonDataUrl, userId })
                });

                if (!res.ok) {
                    throw new Error('?�버 ?�?�에 ?�패?�습?�다.');
                }

                message.success('마이?�툰???�?�되?�습?�다!');
                setActiveTab('webtoon');
                setWebtoonViewOpen(false);
                setSelectedImages([]);
                setIsSelectionMode(false);
            }

        } catch (err: any) {
            console.error(err);
            message.error(err.message || '?�툰 ?�?�에 ?�패?�습?�다.');
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
        if (!window.confirm('???��?지�???��?�시겠습?�까?')) {
            return;
        }

        setDeleting(imageId);
        try {
            const res = await fetch(`/api/gallery/${imageId}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || 'Failed to delete');
            }

            setImages(prev => prev.filter(img => img.id !== imageId));
            message.success('?��?지가 ??��?�었?�니??');
            // If deleting via modal, close it
            if (previewImage) setPreviewImage(null);
        } catch (err: any) {
            console.error(err);
            message.error(err.message || '??��???�패?�습?�다.');
        } finally {
            setDeleting(null);
        }
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error(err);
            message.error('?�운로드???�패?�습?�다.');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedImages.length === 0) return;

        if (!window.confirm(`?�택??${selectedImages.length}?�의 ?��?지�???��?�시겠습?�까?`)) {
            return;
        }

        setDeleting('bulk');
        try {
            const results = await Promise.all(selectedImages.map(id =>
                fetch(`/api/gallery/${id}`, {
                    method: 'DELETE'
                }).then(res => ({ id, ok: res.ok }))
            ));

            const failed = results.filter(r => !r.ok);
            if (failed.length > 0) {
                console.error('Failed to delete some images:', failed);
                message.warning(`${failed.length}?�의 ?��?지�???��?��? 못했?�니??`);
            }

            const successfulIds = results.filter(r => r.ok).map(r => r.id);
            setImages(prev => prev.filter(img => !successfulIds.includes(img.id)));
            setSelectedImages(prev => prev.filter(id => !successfulIds.includes(id)));

            if (failed.length === 0) {
                message.success('??��?�었?�니??');
            }
        } catch (err) {
            console.error(err);
            message.error('??�� �??�류가 발생?�습?�다.');
        } finally {
            setDeleting(null);
            setIsSelectionMode(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center animate-fade-in flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                            ????
                        </Link>
                        <h1 className="text-2xl font-bold text-white">
                            My <span className="text-[#CCFF00]">Gallery</span>
                        </h1>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-white/10 rounded-lg p-1 order-last md:order-none w-full md:w-auto justify-center">
                        <button
                            onClick={() => setActiveTab('image')}
                            className={`px-3 py-2 rounded-md transition-all text-sm ${activeTab === 'image'
                                ? 'bg-[#CCFF00] text-black font-bold shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            ?���?마이?�냅
                        </button>
                        <button
                            onClick={() => setActiveTab('webtoon')}
                            className={`px-3 py-2 rounded-md transition-all text-sm ${activeTab === 'webtoon'
                                ? 'bg-[#CCFF00] text-black font-bold shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            ?�� 마이?�툰
                        </button>
                        <button
                            onClick={() => setActiveTab('premium')}
                            className={`px-3 py-2 rounded-md transition-all text-sm ${activeTab === 'premium'
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            ???�리미엄
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={fetchImages}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                        >
                            <ReloadOutlined spin={loading} />
                            ?�로고침
                        </button>
                    </div>
                </div>

                {/* Help Text */}
                <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                    {activeTab === 'image' ? (
                        <p className="text-sm text-gray-400">
                            ?�� <strong className="text-white">마이?�냅:</strong> 변?�된 ?��?지가 ?�기???�?�됩?�다.<br />
                            <span className="text-gray-500">
                                ???��?지�?길게 ?�러 ?�택 ??<strong className="text-[#CCFF00]">?�툰 보기</strong>�??�쳐보세??<br />
                                ???�릭?�면 ?�게 보고 ?�운로드/공유?????�습?�다.
                            </span>
                        </p>
                    ) : activeTab === 'webtoon' ? (
                        <p className="text-sm text-gray-400">
                            ?�� <strong className="text-white">마이?�툰:</strong> ?�러 ?��?지�??�쳐 만든 ?�툰???�?�됩?�다.<br />
                            <span className="text-gray-500">
                                ???�툰 ?��?지�??�릭 ??<strong className="text-purple-400">?�리미엄 변??/strong>?�로 고퀄리???�그?�이??
                            </span>
                        </p>
                    ) : (
                        <p className="text-sm text-gray-400">
                            ??<strong className="text-white">?�리미엄:</strong> AI�?고퀄리??변?�된 ?�툰???�?�됩?�다.<br />
                            <span className="text-gray-500">
                                ??800×1280px ?�네마틱 ?�리미엄 ?�툰 ?�식
                            </span>
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
                                            created_at: img.createdAt
                                        } as any);
                                    }}
                                >
                                    <img
                                        src={img.url}
                                        alt="Premium Webtoon"
                                    />
                                    <div className="webtoon-preview-blur" />
                                    {/* Premium Badge */}
                                    <div className="premium-badge bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold text-[10px]">
                                        ??PRO
                                    </div>
                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePremiumDelete(img.id);
                                        }}
                                        className="delete-btn w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                    >
                                        <DeleteOutlined />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <GlassCard className="text-center py-16">
                            <p className="text-gray-400 text-lg mb-4">
                                ?�직 ?�리미엄 변?�된 ?�툰???�습?�다.
                            </p>
                            <p className="text-sm text-gray-500 mb-4">
                                마이?�툰?�서 ?��?지�??�택?�고 "?�리미엄 변?? 버튼???�러보세??
                            </p>
                            <button
                                onClick={() => setActiveTab('webtoon')}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold"
                            >
                                ?�� 마이?�툰?�로 ?�동
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
                                <div className="flex items-center gap-3 mb-3">
                                    <h3 className="text-sm font-medium text-gray-400">
                                        {getRelativeDateLabel(dateKey)}
                                    </h3>
                                    <div className="flex-1 h-px bg-white/10"></div>
                                    <span className="text-xs text-gray-500">{dateImages.length}??/span>
                                </div>

                                {/* Images Grid */}
                                <div className="gallery-grid">
                                    {dateImages.map((img) => (
                                        <div
                                            key={img.id}
                                            onClick={() => {
                                                if (isSelectionMode && activeTab === 'image') {
                                                    setSelectedImages(prev =>
                                                        prev.includes(img.id)
                                                            ? prev.filter(i => i !== img.id)
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
                                            className={`${activeTab === 'webtoon' ? 'webtoon-preview-card' : 'gallery-item'} group no-touch-callout ${selectedImages.includes(img.id) ? 'ring-2 ring-[#CCFF00]' : ''} ${highlightLatest && images[0]?.id === img.id
                                                ? 'ring-2 ring-[#CCFF00] animate-pulse shadow-lg shadow-[#CCFF00]/30'
                                                : ''
                                                }`}
                                        >
                                            <img
                                                src={img.url}
                                                alt="Generated"
                                                className={activeTab === 'webtoon' ? '' : 'gallery-thumbnail'}
                                            />
                                            {activeTab === 'webtoon' && <div className="webtoon-preview-blur" />}

                                            {activeTab === 'image' && (
                                                <div
                                                    className={`absolute top-2 right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer z-10 ${selectedImages.includes(img.id)
                                                        ? 'bg-[#CCFF00] border-[#CCFF00] scale-100 opacity-100'
                                                        : isSelectionMode
                                                            ? 'border-white/60 bg-black/40 scale-100 opacity-100'
                                                            : 'border-white/60 bg-black/40 scale-95 opacity-0 group-hover:opacity-100 hover:bg-black/60 hover:border-white'
                                                        }`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedImages(prev =>
                                                            prev.includes(img.id)
                                                                ? prev.filter(i => i !== img.id)
                                                                : [...prev, img.id]
                                                        );
                                                    }}
                                                >
                                                    {selectedImages.includes(img.id) && <CheckCircleFilled className="text-black text-sm" />}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <GlassCard className="text-center py-16">
                        <p className="text-gray-400 text-lg mb-4">
                            {activeTab === 'image' ? '?�직 변?�된 ?��?지가 ?�습?�다.' : '?�?�된 ?�툰???�습?�다.'}
                        </p>
                        <Link href="/">
                            <button className="accent-btn">
                                ???�품 만들??가�?
                            </button>
                        </Link>
                        <p className="text-xs text-gray-600 mt-4">User ID: {userId?.slice(0, 8)}...</p>
                    </GlassCard>
                )}

                {/* Selection Action Bar (Image Tab & Selection active) */}
                {activeTab === 'image' && selectedImages.length > 0 && (
                    <div className="fixed bottom-8 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 bg-[#1a1a1a] border border-white/10 rounded-2xl p-3 flex items-center justify-center gap-3 md:gap-4 shadow-2xl z-50 animate-fade-in max-w-md mx-auto">
                        <button
                            onClick={() => { setSelectedImages([]); setIsSelectionMode(false); }}
                            className="text-white/60 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                            title="?�택 취소"
                        >
                            ??
                        </button>
                        <span className="text-white font-bold px-2">
                            {selectedImages.length}??
                        </span>
                        <div className="h-6 w-px bg-white/10"></div>
                        <button
                            onClick={() => setWebtoonViewOpen(true)}
                            className="bg-[#CCFF00] text-black px-4 py-2 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm"
                        >
                            <span>?��</span> ?�툰 보기
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBulkDelete();
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
                        >
                            <DeleteOutlined /> ??��
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
                            border: '1px solid rgba(255,255,255,0.1)'
                        }
                    }}
                    closeIcon={<span className="text-white text-xl bg-black/50 w-8 h-8 flex items-center justify-center rounded-full mt-2 mr-2">×</span>}
                >
                    {previewImage && (
                        <div className="flex flex-col">
                            {/* Toggle (Only if original exists) */}
                            {images.find(i => i.url === previewImage)?.original_url && (
                                <div className="flex justify-center p-4 bg-black/20">
                                    <div className="flex bg-black/40 rounded-lg p-1">
                                        <button
                                            onClick={() => setViewMode('processed')}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'processed'
                                                ? 'bg-white text-black shadow'
                                                : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            ??변?�본
                                        </button>
                                        <button
                                            onClick={() => setViewMode('original')}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'original'
                                                ? 'bg-white text-black shadow'
                                                : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            ?�� ?�본
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="relative bg-black min-h-[400px] flex items-center justify-center p-4">
                                <img
                                    src={
                                        viewMode === 'original'
                                            ? images.find(i => i.url === previewImage)?.original_url || previewImage
                                            : previewImage
                                    }
                                    alt="Preview"
                                    className="max-h-[50vh] w-auto object-contain rounded-lg"
                                />
                            </div>

                            <div className="p-4 border-t border-white/10 bg-[#1a1a1a]">
                                {/* Primary: Story Share Button - Large and Prominent */}
                                <button
                                    onClick={() => handleShare(
                                        viewMode === 'original'
                                            ? images.find(i => i.url === previewImage)?.original_url || previewImage
                                            : previewImage
                                    )}
                                    className="w-full mb-3 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
                                    }}
                                >
                                    <span style={{ fontSize: '22px' }}>?��</span>
                                    ?�토리에 공유?�기
                                </button>

                                {/* Secondary Actions Row */}
                                <div className="flex justify-between items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const imgId = images.find(i => i.url === previewImage)?.id;
                                            if (imgId) {
                                                handleDelete(imgId);
                                                setPreviewImage(null);
                                            }
                                        }}
                                        className="px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-1.5 transition-colors text-sm"
                                    >
                                        <DeleteOutlined /> ??��
                                    </button>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDownload(
                                                viewMode === 'original'
                                                    ? images.find(i => i.url === previewImage)?.original_url || previewImage
                                                    : previewImage,
                                                `toonsnap-${Date.now()}.png`
                                            )}
                                            className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-1.5 transition-colors text-sm"
                                        >
                                            <DownloadOutlined /> ?�??
                                        </button>
                                        <button
                                            onClick={() => handleKakaoShare(
                                                viewMode === 'original'
                                                    ? images.find(i => i.url === previewImage)?.original_url || previewImage
                                                    : previewImage
                                            )}
                                            className="px-3 py-2.5 bg-[#ffe812] hover:bg-[#ffe812]/90 text-black rounded-lg flex items-center gap-1.5 transition-colors text-sm font-bold"
                                            title="카카?�톡 공유"
                                        >
                                            <MessageOutlined /> 카카??
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* 마이?�툰 ?�용 ?�?�크�??�크�?뷰어 */}
                <Modal
                    open={!!webtoonPreviewImage}
                    footer={null}
                    onCancel={() => setWebtoonPreviewImage(null)}
                    width={800}
                    centered
                    style={{
                        maxWidth: '100vw',
                        padding: 0
                    }}
                    styles={{
                        content: {
                            background: '#0a0a0a',
                            padding: '0',
                            borderRadius: '12px',
                            maxHeight: '95vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        },
                        body: {
                            padding: 0,
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            overflowY: 'auto'  // Enable vertical scroll
                        }
                    }}
                    closeIcon={
                        <span className="absolute right-3 top-3 z-50 text-white text-xl bg-black/60 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:bg-black/80">
                            ×
                        </span>
                    }
                >
                    {webtoonPreviewImage && (
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border-b border-white/10">
                                <div className="text-white font-medium">
                                    ?�� 마이?�툰 뷰어
                                </div>
                                <span className="text-gray-400 text-sm">
                                    {new Date((webtoonPreviewImage.createdAt || webtoonPreviewImage.created_at) * 1000).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>

                            {/* Scrollable Image Container */}
                            <div
                                ref={webtoonScrollRef}
                                className="flex-1 overflow-y-auto webtoon-fullscreen-scroll">
                                <div className="webtoon-fullscreen-container">
                                    <img
                                        src={webtoonPreviewImage.url}
                                        alt="Webtoon"
                                        className="webtoon-fullscreen-image"
                                    />
                                </div>
                            </div>

                            {/* Converting Status Bar */}
                            {convertingPremium && (
                                <div className="px-4 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/10">
                                    <div className="flex items-center justify-center gap-2 text-white">
                                        <Spin size="small" />
                                        <span className="text-sm font-medium">?�리미엄 변??�?..</span>
                                    </div>
                                    <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" style={{ width: '60%' }}></div>
                                    </div>
                                </div>
                            )}

                            {/* Footer - My Snap Style */}
                            <div className="p-4 bg-[#1a1a1a] border-t border-white/10">
                                {/* Main Action Button - Story Share (smaller) */}
                                <button
                                    onClick={() => handleShare(webtoonPreviewImage.url)}
                                    className="w-full mb-3 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                                    }}
                                >
                                    <span>?��</span> ?�토리에 공유?�기
                                </button>

                                {/* Secondary Actions Row */}
                                <div className="flex justify-between items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (webtoonPreviewImage) {
                                                isPremiumPreview
                                                    ? handlePremiumDelete(webtoonPreviewImage.id)
                                                    : handleDelete(webtoonPreviewImage.id);
                                                setWebtoonPreviewImage(null);
                                            }
                                        }}
                                        className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-1.5 text-sm"
                                    >
                                        <DeleteOutlined /> ??��
                                    </button>

                                    <div className="flex gap-2">
                                        {/* Premium Button - Only for non-premium */}
                                        {!isPremiumPreview && (
                                            <button
                                                onClick={handlePremiumConvert}
                                                disabled={convertingPremium}
                                                className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm flex items-center gap-1.5 disabled:opacity-50 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105 active:scale-95"
                                            >
                                                <StarFilled /> ?�리미엄 변??
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDownload(webtoonPreviewImage.url, `webtoon-${Date.now()}.jpg`)}
                                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-1.5 text-sm"
                                        >
                                            <DownloadOutlined /> ?�??
                                        </button>
                                        <button
                                            onClick={() => handleKakaoShare(webtoonPreviewImage.url)}
                                            className="px-3 py-2 bg-[#ffe812] hover:bg-[#ffe812]/90 text-black rounded-lg flex items-center gap-1.5 text-sm font-bold"
                                        >
                                            <MessageOutlined /> 카카??
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* ?�리미엄 ?�용 뷰어 (마이?�툰�?분리) */}
                <Modal
                    open={!!premiumPreviewImage}
                    footer={null}
                    onCancel={() => setPremiumPreviewImage(null)}
                    width={800}
                    centered
                    style={{
                        maxWidth: '100vw',
                        padding: 0
                    }}
                    styles={{
                        content: {
                            background: '#0a0a0a',
                            padding: '0',
                            borderRadius: '12px',
                            maxHeight: '95vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        },
                        body: {
                            padding: 0,
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            overflowY: 'auto'
                        }
                    }}
                    closeIcon={
                        <span className="absolute right-3 top-3 z-50 text-white text-xl bg-black/60 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:bg-black/80">
                            ×
                        </span>
                    }
                    afterOpenChange={(open) => {
                        if (open && premiumScrollRef.current) {
                            premiumScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
                        }
                    }}
                >
                    {premiumPreviewImage && (
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/10">
                                <div className="text-white font-medium flex items-center gap-2">
                                    ??<span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold">?�리미엄 뷰어</span>
                                </div>
                                <span className="text-gray-400 text-sm">
                                    {new Date((premiumPreviewImage.createdAt || premiumPreviewImage.created_at) * 1000).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>

                            {/* Scrollable Image Container */}
                            <div
                                ref={premiumScrollRef}
                                className="flex-1 overflow-y-auto webtoon-fullscreen-scroll"
                            >
                                <div className="webtoon-fullscreen-container">
                                    <img
                                        src={premiumPreviewImage.url}
                                        alt="Premium Webtoon"
                                        className="webtoon-fullscreen-image"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-[#1a1a1a] border-t border-white/10">
                                <button
                                    onClick={() => handleShare(premiumPreviewImage.url)}
                                    className="w-full mb-3 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                                    }}
                                >
                                    <span>?��</span> ?�토리에 공유?�기
                                </button>

                                <div className="flex justify-between items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (premiumPreviewImage) {
                                                handlePremiumDelete(premiumPreviewImage.id);
                                                setPremiumPreviewImage(null);
                                            }
                                        }}
                                        className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-1.5 text-sm"
                                    >
                                        <DeleteOutlined /> ??��
                                    </button>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDownload(premiumPreviewImage.url, `premium-${Date.now()}.jpg`)}
                                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-1.5 text-sm"
                                        >
                                            <DownloadOutlined /> ?�??
                                        </button>
                                        <button
                                            onClick={() => handleKakaoShare(premiumPreviewImage.url)}
                                            className="px-3 py-2 bg-[#ffe812] hover:bg-[#ffe812]/90 text-black rounded-lg flex items-center gap-1.5 text-sm font-bold"
                                        >
                                            <MessageOutlined /> 카카??
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
                    width="800px"
                    styles={{
                        content: {
                            background: smartLayoutEnabled ? '#0a0a0a' : '#fff',
                            padding: '0',
                            borderRadius: '12px',
                            overflow: 'visible',
                            maxHeight: '95vh',
                            display: 'flex',
                            flexDirection: 'column'
                        }
                    }}
                    closeIcon={<span className={`text-xl z-50 fixed right-4 top-4 rounded-full p-2 shadow-lg cursor-pointer ${smartLayoutEnabled ? 'text-white bg-black/50' : 'text-black bg-white'}`}>×</span>}
                >
                    {/* Smart Layout Toggle Header */}
                    <div className={`p-3 border-b flex justify-between items-center ${smartLayoutEnabled ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-gray-200'}`}>
                        <span className={`text-sm font-medium ${smartLayoutEnabled ? 'text-white' : 'text-gray-700'}`}>
                            {selectedImages.length}�??�결??
                        </span>
                        <button
                            onClick={async () => {
                                if (!smartLayoutEnabled) {
                                    // Analyze layout
                                    setAnalyzingLayout(true);
                                    try {
                                        const selectedImgs = images
                                            .filter(img => selectedImages.includes(img.id))
                                            .sort((a, b) => selectedImages.indexOf(a.id) - selectedImages.indexOf(b.id))
                                            .map(img => img.url);

                                        const res = await fetch('/api/ai/analyze-layout', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ images: selectedImgs })
                                        });

                                        const data = await res.json();
                                        console.log('[SmartLayout] API Response:', data);

                                        if (data.success && data.layouts) {
                                            setPanelLayouts(data.layouts);
                                            setSmartLayoutEnabled(true);
                                        } else {
                                            console.error('[SmartLayout] Failed:', data);
                                            message.error(data.error || '?�이?�웃 분석???�패?�습?�다.');
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        message.error('?�이?�웃 분석 �??�류가 발생?�습?�다.');
                                    } finally {
                                        setAnalyzingLayout(false);
                                    }
                                } else {
                                    setSmartLayoutEnabled(false);
                                    setPanelLayouts([]);
                                }
                            }}
                            disabled={analyzingLayout}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${smartLayoutEnabled
                                ? 'bg-[#CCFF00] text-black'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {analyzingLayout ? (
                                <><Spin size="small" /> 분석�?..</>
                            ) : (
                                <>???�마???�이?�웃 {smartLayoutEnabled ? 'ON' : 'OFF'}</>
                            )}
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className={`flex-1 overflow-y-auto p-0 relative webtoon-scroll-container ${smartLayoutEnabled ? 'bg-[#0a0a0a]' : 'bg-gray-100'}`}>
                        {smartLayoutEnabled && panelLayouts.length > 0 ? (
                            <WebtoonViewer
                                images={images
                                    .filter(img => selectedImages.includes(img.id))
                                    .sort((a, b) => selectedImages.indexOf(a.id) - selectedImages.indexOf(b.id))
                                    .map(img => img.url)
                                }
                                layouts={panelLayouts}
                            />
                        ) : (
                            images
                                .filter(img => selectedImages.includes(img.id))
                                .sort((a, b) => selectedImages.indexOf(a.id) - selectedImages.indexOf(b.id))
                                .map((img) => (
                                    <img
                                        key={img.id}
                                        src={img.url}
                                        alt="Webtoon frame"
                                        className="w-full h-auto block"
                                    />
                                ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className={`p-4 border-t flex justify-end items-center gap-3 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] ${smartLayoutEnabled ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-gray-200'}`}>
                        <button
                            onClick={() => {
                                setWebtoonViewOpen(false);
                                setPanelLayouts([]);
                                setSmartLayoutEnabled(false);
                            }}
                            className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${smartLayoutEnabled ? 'text-gray-400 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            ?�기
                        </button>
                        <button
                            onClick={handleWebtoonSave}
                            disabled={savingWebtoon}
                            className="px-6 py-2.5 bg-[#CCFF00] hover:bg-[#bbe600] text-black rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                        >
                            {savingWebtoon ? <Spin size="small" /> : <DownloadOutlined />}
                            마이?�툰???�??
                        </button>
                    </div>
                </Modal>

                {/* 변??결과 ?�업 모달 */}
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
                            overflow: 'hidden'
                        },
                        mask: {
                            backdropFilter: 'blur(8px)'
                        }
                    }}
                >
                    <div className="p-6 text-center">
                        {/* Success Icon */}
                        <div className="mb-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#CCFF00] to-[#88cc00] flex items-center justify-center shadow-lg shadow-[#CCFF00]/30">
                                <CheckCircleFilled className="text-3xl text-black" />
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-white mb-2">
                            ??변???�료!
                        </h3>
                        <p className="text-gray-400 text-sm mb-6">
                            {activeTab === 'webtoon'
                                ? '?�툰???�공?�으�??�?�되?�습?�다.'
                                : '?�진???�공?�으�?변?�되?�습?�다.'}
                        </p>

                        {/* Preview of latest image */}
                        {((activeTab === 'webtoon' && images.length > 0) ||
                            (activeTab === 'image' && images.length > 0)) && (
                                <div className="mb-6 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                                    <img
                                        src={images[0]?.url}
                                        alt="변??결과"
                                        className="w-full max-h-48 object-cover"
                                    />
                                </div>
                            )}

                        {/* Premium ?�도 (?�툰 ??�� ?�만) */}
                        {activeTab === 'webtoon' && (
                            <div className="mb-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                                <div className="flex items-center gap-2 justify-center mb-2">
                                    <StarFilled className="text-purple-400" />
                                    <span className="text-purple-400 font-semibold text-sm">?�리미엄 변??/span>
                                </div>
                                <p className="text-gray-400 text-xs">
                                    ??고퀄리???�툰?�로 ?�그?�이?�해보세??<br />
                                    ?��?지�??�릭?�면 ?�리미엄 변?�이 가?�합?�다.
                                </p>
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            onClick={() => {
                                setShowResultModal(false);
                                setHighlightLatest(true);
                                // 5�????�이?�이???�동 ?�제
                                setTimeout(() => setHighlightLatest(false), 5000);
                            }}
                            className="w-full py-3 bg-[#CCFF00] hover:bg-[#bbe600] text-black rounded-xl font-bold transition-all active:scale-95"
                        >
                            ?�인?�기
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
        <Suspense fallback={
            <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-8 flex items-center justify-center">
                <Spin size="large" />
            </main>
        }>
            <GalleryContent />
        </Suspense>
    );
}

