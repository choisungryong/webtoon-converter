'use client';

export const runtime = 'edge';
import { useState, useRef, useEffect } from 'react';
import { message, Progress, Image, Spin, Modal } from 'antd';
import { CheckCircleFilled, LoadingOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

import Header, { AppMode, ThemeMode } from '../components/Header';
import GlassCard from '../components/GlassCard';
import StyleSelector from '../components/StyleSelector';
import { StyleOption, DEFAULT_STYLE } from '../data/styles';

interface GalleryImage {
    id: string;
    url: string;
}

export default function Home() {
    // Mode State
    const [mode, setMode] = useState<AppMode>('photo');
    const [theme, setTheme] = useState<ThemeMode>('dark');

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Photo Mode State
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');

    // Video Mode State
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
    const [selectedFrameIndices, setSelectedFrameIndices] = useState<number[]>([]);

    // Gallery Mode State
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [galleryLoading, setGalleryLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Common State
    const [selectedStyle, setSelectedStyle] = useState<StyleOption>(DEFAULT_STYLE);
    const [converting, setConverting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [aiImages, setAiImages] = useState<string[]>([]);
    const [analyzing, setAnalyzing] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load gallery when mode changes
    useEffect(() => {
        if (mode === 'gallery') {
            fetchGallery();
        }
    }, [mode]);

    const fetchGallery = async () => {
        setGalleryLoading(true);
        try {
            const res = await axios.get('/api/gallery');
            setGalleryImages(res.data.images || []);
        } catch (err) {
            console.error(err);
        } finally {
            setGalleryLoading(false);
        }
    };

    // Toggle image selection in gallery
    const toggleImageSelection = (id: string) => {
        setSelectedImages(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    // Delete selected images
    const handleDeleteSelected = async () => {
        if (selectedImages.length === 0) return;

        Modal.confirm({
            title: `${selectedImages.length}개 이미지 삭제`,
            icon: <ExclamationCircleOutlined />,
            content: '선택한 이미지를 삭제하시겠습니까?',
            okText: '삭제',
            okType: 'danger',
            cancelText: '취소',
            onOk: async () => {
                setDeleting(true);
                try {
                    await Promise.all(
                        selectedImages.map(id => axios.delete(`/api/gallery/${id}`))
                    );
                    setGalleryImages(prev => prev.filter(img => !selectedImages.includes(img.id)));
                    setSelectedImages([]);
                    message.success('삭제되었습니다.');
                } catch (err) {
                    message.error('삭제 실패');
                } finally {
                    setDeleting(false);
                }
            }
        });
    };

    // Photo Mode: Handle file selection
    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            message.error('이미지 파일만 가능합니다.');
            return;
        }
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        setAiImages([]);
    };

    // Video Mode: Handle file selection
    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('video/')) {
            message.error('동영상 파일만 가능합니다.');
            return;
        }
        setVideoFile(file);
        setExtractedFrames([]);
        setSelectedFrameIndices([]);
        setAiImages([]);
        if (videoRef.current) {
            videoRef.current.src = URL.createObjectURL(file);
            videoRef.current.load();
            setAnalyzing(true);
        }
    };

    // Video: Extract frames when loaded
    const handleVideoLoaded = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const duration = video.duration;
        const count = 12;
        const interval = duration / (count + 1);
        const timestamps = Array.from({ length: count }, (_, i) => interval * (i + 1));
        const frames: string[] = [];

        try {
            message.loading({ content: '주요 장면 분석 중...', key: 'analyze' });
            for (const time of timestamps) {
                video.currentTime = time;
                await new Promise(resolve => {
                    video.onseeked = () => resolve(true);
                    setTimeout(resolve, 500);
                });
                if (ctx) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    frames.push(canvas.toDataURL('image/jpeg', 0.8));
                }
            }
            setExtractedFrames(frames);
            setSelectedFrameIndices([0, 1, 2]);
            message.success({ content: '장면 추출 완료!', key: 'analyze' });
        } catch (e) {
            message.error({ content: '장면 분석 실패', key: 'analyze' });
        } finally {
            setAnalyzing(false);
        }
    };

    const toggleFrameSelection = (idx: number) => {
        setSelectedFrameIndices(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    // Convert Image(s)
    const handleConvert = async () => {
        let imagesToConvert: string[] = [];
        if (mode === 'photo') {
            if (!photoPreview) {
                message.warning('먼저 사진을 업로드해 주세요!');
                return;
            }
            imagesToConvert = [photoPreview];
        } else if (mode === 'video') {
            if (selectedFrameIndices.length === 0) {
                message.warning('변환할 장면을 선택해 주세요!');
                return;
            }
            imagesToConvert = selectedFrameIndices.map(idx => extractedFrames[idx]);
        }

        setConverting(true);
        setProgress(0);
        setAiImages([]);

        try {
            for (let i = 0; i < imagesToConvert.length; i++) {
                if (i > 0) await new Promise(r => setTimeout(r, 10000));
                const compressedDataUrl = await compressImage(imagesToConvert[i]);
                const res = await axios.post('/api/ai/start', {
                    image: compressedDataUrl,
                    styleId: selectedStyle.id
                });
                if (res.data.success && res.data.image) {
                    setAiImages(prev => [...prev, res.data.image]);
                    setProgress(Math.round(((i + 1) / imagesToConvert.length) * 100));
                }
            }
            message.success('변환 완료!');
        } catch (e: any) {
            message.error(`오류: ${e.message}`);
        } finally {
            setConverting(false);
        }
    };

    const compressImage = (src: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 512;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                } else {
                    if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            img.onerror = () => reject(new Error('이미지 로드 실패'));
            img.src = src;
        });
    };

    const handleReset = () => {
        setPhotoFile(null);
        setPhotoPreview('');
        setVideoFile(null);
        setExtractedFrames([]);
        setSelectedFrameIndices([]);
        setAiImages([]);
        setSelectedImages([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleModeChange = (m: AppMode) => {
        setMode(m);
        if (m !== 'gallery') handleReset();
    };

    return (
        <main className="min-h-screen flex flex-col items-center px-4 py-6" style={{ background: 'var(--bg-primary)' }}>
            <video ref={videoRef} style={{ display: 'none' }} onLoadedData={handleVideoLoaded} crossOrigin="anonymous" muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="w-full max-w-md space-y-5">
                {/* Header */}
                <Header
                    mode={mode}
                    onModeChange={handleModeChange}
                    theme={theme}
                    onThemeChange={setTheme}
                />

                {/* Photo Mode */}
                {mode === 'photo' && (
                    <>
                        <GlassCard padding="lg">
                            {!photoPreview ? (
                                <label className="upload-area block cursor-pointer">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handlePhotoSelect}
                                    />
                                    <div className="upload-icon">
                                        <span style={{ fontSize: '32px' }}>📷</span>
                                    </div>
                                    <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                        사진을 선택하세요!
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
                                        드래그 & 드롭 · 클릭
                                    </p>
                                </label>
                            ) : (
                                <div className="space-y-4">
                                    <div className="preview-container relative">
                                        <img src={photoPreview} alt="Preview" />
                                        <button
                                            onClick={handleReset}
                                            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                                            style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        {photoPreview && (
                            <>
                                <GlassCard>
                                    <StyleSelector selectedStyleId={selectedStyle.id} onStyleSelect={setSelectedStyle} />
                                </GlassCard>
                                <button className="accent-btn w-full" onClick={handleConvert} disabled={converting}>
                                    {converting ? `변환 중... ${progress}%` : '✨ 웹툰으로 변환하기'}
                                </button>
                            </>
                        )}

                        {aiImages.length > 0 && (
                            <GlassCard>
                                <p className="font-medium mb-3" style={{ color: 'var(--accent-color)' }}>변환 결과</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {aiImages.map((img, idx) => (
                                        <div key={idx} className="preview-container">
                                            <Image src={img} alt={`Result ${idx}`} />
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        )}
                    </>
                )}

                {/* Video Mode */}
                {mode === 'video' && (
                    <>
                        <GlassCard padding="lg">
                            {!videoFile ? (
                                <label className="upload-area block cursor-pointer">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/*"
                                        style={{ display: 'none' }}
                                        onChange={handleVideoSelect}
                                    />
                                    <div className="upload-icon">
                                        <span style={{ fontSize: '32px' }}>🎬</span>
                                    </div>
                                    <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                        영상을 선택하세요!
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
                                        MP4, MOV, WebM
                                    </p>
                                </label>
                            ) : (
                                <div className="text-center py-4">
                                    <p style={{ color: 'var(--text-primary)' }}>{videoFile.name}</p>
                                    {analyzing && <Spin className="mt-2" />}
                                </div>
                            )}
                        </GlassCard>

                        {extractedFrames.length > 0 && (
                            <>
                                <GlassCard>
                                    <p className="font-medium mb-3" style={{ color: 'var(--accent-color)' }}>
                                        장면 선택 ({selectedFrameIndices.length})
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {extractedFrames.map((frame, idx) => (
                                            <div
                                                key={idx}
                                                className="relative aspect-square cursor-pointer rounded-lg overflow-hidden"
                                                onClick={() => toggleFrameSelection(idx)}
                                            >
                                                <img src={frame} className="w-full h-full object-cover" />
                                                {selectedFrameIndices.includes(idx) && (
                                                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
                                                        <CheckCircleFilled style={{ color: 'var(--accent-color)', fontSize: '24px' }} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>
                                <GlassCard>
                                    <StyleSelector selectedStyleId={selectedStyle.id} onStyleSelect={setSelectedStyle} />
                                </GlassCard>
                                <button className="accent-btn w-full" onClick={handleConvert} disabled={converting}>
                                    {converting ? `변환 중... ${progress}%` : '✨ 웹툰으로 변환하기'}
                                </button>
                            </>
                        )}
                    </>
                )}

                {/* Gallery Mode */}
                {mode === 'gallery' && (
                    <>
                        {galleryLoading ? (
                            <div className="py-20 text-center">
                                <Spin size="large" />
                            </div>
                        ) : galleryImages.length > 0 ? (
                            <div className="gallery-grid">
                                {galleryImages.map((img) => (
                                    <div
                                        key={img.id}
                                        className={`gallery-item ${selectedImages.includes(img.id) ? 'selected' : ''}`}
                                        onClick={() => toggleImageSelection(img.id)}
                                    >
                                        <Image
                                            src={img.url}
                                            alt="Gallery"
                                            className="w-full aspect-square object-cover"
                                            preview={selectedImages.length === 0}
                                        />
                                        <div className="select-circle">
                                            {selectedImages.includes(img.id) && (
                                                <CheckCircleFilled style={{ color: 'white', fontSize: '14px' }} />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <GlassCard className="text-center py-12">
                                <p style={{ color: 'var(--text-muted)' }}>변환된 이미지가 없습니다.</p>
                            </GlassCard>
                        )}

                        {/* Selection Bar */}
                        {selectedImages.length > 0 && (
                            <div className="selection-bar">
                                <span style={{ color: 'var(--text-primary)' }}>
                                    {selectedImages.length}개 선택
                                </span>
                                <button
                                    onClick={handleDeleteSelected}
                                    disabled={deleting}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg"
                                    style={{ background: '#ef4444', color: 'white' }}
                                >
                                    <DeleteOutlined />
                                    삭제
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}