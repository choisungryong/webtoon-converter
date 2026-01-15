'use client';

import { useEffect, useState } from 'react';
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

    const fetchImages = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/gallery?type=${activeTab}`);
            const data = await res.json();
            setImages(data.images || []);
            setSelectedImages([]); // Reset selection on tab change
        } catch (err) {
            console.error(err);
            message.error('갤러리를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, [activeTab]);

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
                message.success('툰 보관소에 저장되었습니다!');
                setActiveTab('webtoon'); // Switch to Toon Archive
                setWebtoonViewOpen(false);
            }

            // 6. Download Locally
            const link = document.createElement('a');
            link.href = webtoonDataUrl;
            link.download = `webtoon-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error(err);
            message.error('웹툰 저장에 실패했습니다.');
        } finally {
            setSavingWebtoon(false);
        }
    };

    const handleDelete = async (imageId: string) => {
        Modal.confirm({
            title: '이미지 삭제',
            icon: <ExclamationCircleOutlined />,
            content: '이 이미지를 삭제하시겠습니까?',
            okText: '삭제',
            okType: 'danger',
            cancelText: '취소',
            onOk: async () => {
                setDeleting(imageId);
                try {
                    await fetch(`/api/gallery/${imageId}`, { method: 'DELETE' });
                    setImages(prev => prev.filter(img => img.id !== imageId));
                    message.success('이미지가 삭제되었습니다.');
                } catch (err) {
                    console.error(err);
                    message.error('삭제에 실패했습니다.');
                } finally {
                    setDeleting(null);
                }
            }
        });
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

    return (
        <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center animate-fade-in">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                            ← 홈
                        </Link>
                        <h1 className="text-2xl font-bold text-white">
                            My <span className="text-[#CCFF00]">Gallery</span>
                        </h1>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-white/10 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('image')}
                            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'image'
                                ? 'bg-[#CCFF00] text-black font-bold shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            📸 컷 보관소
                        </button>
                        <button
                            onClick={() => setActiveTab('webtoon')}
                            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'webtoon'
                                ? 'bg-[#CCFF00] text-black font-bold shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            📜 툰 보관소
                        </button>
                    </div>

                    <button
                        onClick={fetchImages}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                    >
                        <ReloadOutlined spin={loading} />
                        새로고침
                    </button>
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
                                className={`gallery-item group ${selectedImages.includes(img.id) ? 'ring-2 ring-[#CCFF00]' : ''}`}
                                onClick={() => {
                                    if (activeTab === 'image') {
                                        // Toggle selection logic for webtoon creation only in image tab
                                        if (selectedImages.length > 0 || (window.event as any)?.ctrlKey) {
                                            setSelectedImages(prev =>
                                                prev.includes(img.id)
                                                    ? prev.filter(i => i !== img.id)
                                                    : [...prev, img.id]
                                            );
                                        } else {
                                            setPreviewImage(img.url);
                                            setViewMode('processed'); // Default to processed view
                                        }
                                    } else {
                                        setPreviewImage(img.url);
                                    }
                                }}
                            >
                                <img
                                    src={img.url}
                                    alt="Generated"
                                    className="gallery-thumbnail"
                                />

                                {activeTab === 'image' && (
                                    <div
                                        className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer z-10 ${selectedImages.includes(img.id)
                                            ? 'bg-[#CCFF00] border-[#CCFF00]'
                                            : 'border-white/50 hover:border-white bg-black/30'
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

                                {/* Delete Button */}
                                <button
                                    className="delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(img.id);
                                    }}
                                    disabled={deleting === img.id}
                                >
                                    {deleting === img.id ? '...' : <DeleteOutlined />}
                                </button>
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
                    </GlassCard>
                )}

                {/* Selection Action Bar (Image Tab Only) */}
                {activeTab === 'image' && selectedImages.length > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 flex items-center gap-6 shadow-2xl z-50 animate-fade-in">
                        <span className="text-white font-bold ml-2">
                            {selectedImages.length}장 선택됨
                        </span>
                        <div className="h-8 w-px bg-white/10"></div>
                        <button
                            onClick={() => setWebtoonViewOpen(true)}
                            className="bg-[#CCFF00] text-black px-6 py-2 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <span>📜</span> 웹툰 보기
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
                            {/* Toggle (Only for Cut Archive and if original exists) */}
                            {activeTab === 'image' && images.find(i => i.url === previewImage)?.original_url && (
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
                                    className="max-h-[70vh] w-auto object-contain rounded-lg"
                                />
                            </div>

                            <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-[#1a1a1a]">
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
                            overflow: 'hidden',
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
                                툰 보관소에 저장
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </main>
    );
}
