'use client';

import { useEffect, useState, useRef } from 'react';
import { Spin, Modal, message } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined, CheckCircleFilled, DownloadOutlined } from '@ant-design/icons';

import Link from 'next/link';
import GlassCard from '../../components/GlassCard';

interface GalleryImage {
    id: string;
    url: string;
    original_url?: string;
    r2_key: string;
    prompt?: string;
    created_at: number;
}

export default function GalleryPage() {
    const [activeTab, setActiveTab] = useState<'image' | 'webtoon'>('image');
    const [savingWebtoon, setSavingWebtoon] = useState(false);
    const [viewMode, setViewMode] = useState<'processed' | 'original'>('processed');

    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [webtoonViewOpen, setWebtoonViewOpen] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

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

    const fetchImages = async () => {
        setLoading(true);
        try {
            const currentUserId = localStorage.getItem('toonsnap_user_id');
            const headers: HeadersInit = {};
            if (currentUserId) {
                headers['x-user-id'] = currentUserId;
            }

            const res = await fetch(`/api/gallery?type=${activeTab}`, { ...headers, cache: 'no-store' });

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
            message.error(err.message || '갤러리를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchImages();
        }
    }, [activeTab, userId]);

    const handleWebtoonSave = async () => {
        if (selectedImages.length === 0) return;
        setSavingWebtoon(true);

        try {
            // 1. Load all images
            const sortedSelectedImages = images
                .filter(img => selectedImages.includes(img.id))
                .sort((a, b) => selectedImages.indexOf(a.id) - selectedImages.indexOf(b.id));

            const loadedImages = await Promise.all(
                sortedSelectedImages.map(img => new Promise<HTMLImageElement>((resolve, reject) => {
                    const image = new window.Image();
                    image.crossOrigin = 'anonymous';
                    image.onload = () => resolve(image);
                    image.onerror = reject;
                    image.src = img.url;
                }))
            );

            // 2. Calculate dimensions
            const maxWidth = Math.max(...loadedImages.map(img => img.width));
            const totalHeight = loadedImages.reduce((sum, img) => {
                // Resize height proportionally if width is scaled up to maxWidth
                const scale = maxWidth / img.width;
                return sum + (img.height * scale);
            }, 0);

            // 3. Draw to canvas
            const canvas = document.createElement('canvas');
            canvas.width = maxWidth;
            canvas.height = totalHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) throw new Error('Canvas context not available');

            let currentY = 0;
            loadedImages.forEach(img => {
                const scale = maxWidth / img.width;
                const h = img.height * scale;
                ctx.drawImage(img, 0, currentY, maxWidth, h);
                currentY += h;
            });

            // 4. Convert to Data URL
            const webtoonDataUrl = canvas.toDataURL('image/jpeg', 0.9);

            // 5. Save to Server (Toon Archive)
            const userId = localStorage.getItem('toonsnap_user_id');
            if (userId) {
                await fetch('/api/webtoon/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: webtoonDataUrl, userId })
                });
                message.success('마이웹툰에 저장되었습니다!');
                setActiveTab('webtoon'); // Switch to My Webtoon
                setWebtoonViewOpen(false);
                setSelectedImages([]); // Clear selection
                setIsSelectionMode(false);
            }

        } catch (err) {
            console.error(err);
            message.error('웹툰 저장에 실패했습니다.');
        } finally {
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
                method: 'DELETE'
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || 'Failed to delete');
            }

            setImages(prev => prev.filter(img => img.id !== imageId));
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
            const results = await Promise.all(selectedImages.map(id =>
                fetch(`/api/gallery/${id}`, {
                    method: 'DELETE'
                }).then(res => ({ id, ok: res.ok }))
            ));

            const failed = results.filter(r => !r.ok);
            if (failed.length > 0) {
                console.error('Failed to delete some images:', failed);
                message.warning(`${failed.length}장의 이미지를 삭제하지 못했습니다.`);
            }

            const successfulIds = results.filter(r => r.ok).map(r => r.id);
            setImages(prev => prev.filter(img => !successfulIds.includes(img.id)));
            setSelectedImages(prev => prev.filter(id => !successfulIds.includes(id)));

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
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center animate-fade-in flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                            ← 홈
                        </Link>
                        <h1 className="text-2xl font-bold text-white">
                            My <span className="text-[#CCFF00]">Gallery</span>
                        </h1>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-white/10 rounded-lg p-1 order-last md:order-none w-full md:w-auto justify-center">
                        <button
                            onClick={() => setActiveTab('image')}
                            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'image'
                                ? 'bg-[#CCFF00] text-black font-bold shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            🖼️ 마이스냅
                        </button>
                        <button
                            onClick={() => setActiveTab('webtoon')}
                            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'webtoon'
                                ? 'bg-[#CCFF00] text-black font-bold shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            📖 마이웹툰
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={fetchImages}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                        >
                            <ReloadOutlined spin={loading} />
                            새로고침
                        </button>
                    </div>
                </div>

                {/* Gallery Content */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Spin size="large" />
                    </div>
                ) : images.length > 0 ? (
                    <div className="gallery-grid">
                        {images.map((img) => (
                            <div
                                key={img.id}
                                onClick={() => {
                                    if (isSelectionMode && activeTab === 'image') {
                                        setSelectedImages(prev =>
                                            prev.includes(img.id)
                                                ? prev.filter(i => i !== img.id)
                                                : [...prev, img.id]
                                        );
                                    } else {
                                        setPreviewImage(img.url);
                                        setViewMode('processed');
                                    }
                                }}
                                onTouchStart={() => activeTab === 'image' && handleTouchStart(img.id)}
                                onTouchEnd={handleTouchEnd}
                                onTouchMove={handleTouchEnd}
                                onContextMenu={(e) => e.preventDefault()}
                                className={`gallery-item group no-touch-callout ${selectedImages.includes(img.id) ? 'ring-2 ring-[#CCFF00]' : ''}`}
                            >
                                <img
                                    src={img.url}
                                    alt="Generated"
                                    className="gallery-thumbnail"
                                />

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
                ) : (
                    <GlassCard className="text-center py-16">
                        <p className="text-gray-400 text-lg mb-4">
                            {activeTab === 'image' ? '아직 변환된 이미지가 없습니다.' : '저장된 웹툰이 없습니다.'}
                        </p>
                        <Link href="/">
                            <button className="accent-btn">
                                ✨ 작품 만들러 가기
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
                            title="선택 취소"
                        >
                            ✕
                        </button>
                        <span className="text-white font-bold px-2">
                            {selectedImages.length}장
                        </span>
                        <div className="h-6 w-px bg-white/10"></div>
                        <button
                            onClick={() => setWebtoonViewOpen(true)}
                            className="bg-[#CCFF00] text-black px-4 py-2 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm"
                        >
                            <span>📖</span> 웹툰 보기
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBulkDelete();
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
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
                                            ✨ 변환본
                                        </button>
                                        <button
                                            onClick={() => setViewMode('original')}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'original'
                                                ? 'bg-white text-black shadow'
                                                : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            📷 원본
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

                            <div className="p-4 border-t border-white/10 flex justify-between bg-[#1a1a1a]">
                                <button
                                    onClick={() => {
                                        const imgId = images.find(i => i.url === previewImage)?.id;
                                        if (imgId) {
                                            handleDelete(imgId);
                                            setPreviewImage(null);
                                        }
                                    }}
                                    className="px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <DeleteOutlined /> 삭제
                                </button>
                                <button
                                    onClick={() => handleDownload(
                                        viewMode === 'original'
                                            ? images.find(i => i.url === previewImage)?.original_url || previewImage
                                            : previewImage,
                                        `image-${Date.now()}.png`
                                    )}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <DownloadOutlined /> 저장하기
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* Webtoon Strip View Modal */}
                <Modal
                    open={webtoonViewOpen}
                    footer={null}
                    onCancel={() => setWebtoonViewOpen(false)}
                    centered
                    width="600px"
                    styles={{
                        content: {
                            background: '#fff',
                            padding: '0',
                            borderRadius: '8px',
                            overflow: 'visible',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column'
                        }
                    }}
                    closeIcon={<span className="text-black text-xl z-50 fixed right-4 top-4 bg-white rounded-full p-2 shadow-lg cursor-pointer">×</span>}
                >
                    <div className="flex-1 overflow-y-auto bg-gray-100 p-0 relative webtoon-scroll-container">
                        {images
                            .filter(img => selectedImages.includes(img.id))
                            .sort((a, b) => selectedImages.indexOf(a.id) - selectedImages.indexOf(b.id))
                            .map((img) => (
                                <img
                                    key={img.id}
                                    src={img.url}
                                    alt="Webtoon frame"
                                    className="w-full h-auto block"
                                />
                            ))}
                    </div>
                    <div className="p-4 border-t bg-white flex justify-between items-center z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                        <span className="text-gray-500 font-medium">{selectedImages.length}컷 연결됨</span>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setWebtoonViewOpen(false)}
                                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                            >
                                닫기
                            </button>
                            <button
                                onClick={handleWebtoonSave}
                                disabled={savingWebtoon}
                                className="px-6 py-2.5 bg-[#CCFF00] hover:bg-[#bbe600] text-black rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                            >
                                {savingWebtoon ? <Spin size="small" /> : <DownloadOutlined />}
                                마이웹툰에 저장
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </main>
    );
}
