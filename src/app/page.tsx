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
    const [isDragging, setIsDragging] = useState(false);
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
        if (mode === 'gallery' && userId) {
            fetchGallery();
        }
    }, [mode, userId]);

    const fetchGallery = async () => {
        setGalleryLoading(true);
        try {
            const res = await axios.get('/api/gallery', {
                headers: { 'x-user-id': userId }
            });
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
                    // 순차 삭제 처리로 변경 및 오류 로깅 강화
                    for (const id of selectedImages) {
                        await axios.delete(`/api/gallery/${id}`, {
                            headers: { 'x-user-id': userId }
                        });
                    }
                    setGalleryImages(prev => prev.filter(img => !selectedImages.includes(img.id)));
                    setSelectedImages([]);
                    message.success('삭제되었습니다.');
                } catch (err: any) {
                    console.error('삭제 오류:', err);
                    message.error(`삭제 실패: ${err.message || '알 수 없는 오류'}`);
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

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processVideoFile(file);
    };

    const processVideoFile = (file: File) => {
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

    // Drag and Drop Handlers
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

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        if (mode === 'photo') {
            if (file.type.startsWith('image/')) {
                setPhotoFile(file);
                setPhotoPreview(URL.createObjectURL(file));
                setAiImages([]);
            } else {
                message.error('이미지 파일만 가능합니다.');
            }
        } else if (mode === 'video') {
            processVideoFile(file);
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
                    styleId: selectedStyle.id,
                    userId: userId
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
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '24px 16px',
            background: 'var(--bg-primary)'
        }}>
            <video ref={videoRef} style={{ display: 'none' }} onLoadedData={handleVideoLoaded} crossOrigin="anonymous" muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div style={{ width: '100%', maxWidth: '420px', overflow: 'hidden' }}>
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
                                <label
                                    className="upload-area block cursor-pointer"
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    style={{
                                        borderColor: isDragging ? 'var(--accent-color)' : 'var(--border-color)',
                                        background: isDragging ? 'var(--accent-glow)' : 'transparent'
                                    }}
                                >
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
                                <p style={{
                                    color: 'var(--accent-color)',
                                    fontWeight: 500,
                                    marginBottom: '16px',
                                    paddingLeft: '4px'
                                }}>변환 결과</p>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '12px',
                                    padding: '4px'
                                }}>
                                    {aiImages.map((img, idx) => (
                                        <div key={idx} style={{
                                            borderRadius: '12px',
                                            overflow: 'hidden'
                                        }}>
                                            <Image src={img} alt={`Result ${idx}`} style={{ width: '100%' }} />
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
                                <label
                                    className="upload-area block cursor-pointer"
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    style={{
                                        borderColor: isDragging ? 'var(--accent-color)' : 'var(--border-color)',
                                        background: isDragging ? 'var(--accent-glow)' : 'transparent'
                                    }}
                                >
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
                                    <p style={{
                                        color: 'var(--accent-color)',
                                        fontWeight: 500,
                                        marginBottom: '12px'
                                    }}>
                                        장면 선택 ({selectedFrameIndices.length})
                                    </p>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '8px'
                                    }}>
                                        {extractedFrames.map((frame, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => toggleFrameSelection(idx)}
                                                style={{
                                                    position: 'relative',
                                                    aspectRatio: '1',
                                                    cursor: 'pointer',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    border: selectedFrameIndices.includes(idx)
                                                        ? '2px solid var(--accent-color)'
                                                        : '2px solid transparent'
                                                }}
                                            >
                                                <img
                                                    src={frame}
                                                    alt={`Frame ${idx}`}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                />
                                                {selectedFrameIndices.includes(idx) && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: 'rgba(0,0,0,0.4)'
                                                    }}>
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

                        {aiImages.length > 0 && (
                            <GlassCard>
                                <p style={{
                                    color: 'var(--accent-color)',
                                    fontWeight: 500,
                                    marginBottom: '16px',
                                    paddingLeft: '4px'
                                }}>변환 결과</p>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '12px',
                                    padding: '4px'
                                }}>
                                    {aiImages.map((img, idx) => (
                                        <div key={idx} style={{
                                            borderRadius: '12px',
                                            overflow: 'hidden'
                                        }}>
                                            <Image src={img} alt={`Result ${idx}`} style={{ width: '100%' }} />
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
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