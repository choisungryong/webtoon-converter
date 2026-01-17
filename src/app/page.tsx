'use client';

// runtime config removed to use default nodejs_compat
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { message, Image, Spin } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';

import Header, { AppMode, ThemeMode } from '../components/Header';
import GlassCard from '../components/GlassCard';
import StyleSelector from '../components/StyleSelector';
import SpeechBubbleEditor from '../components/SpeechBubbleEditor';
import { StyleOption, DEFAULT_STYLE } from '../data/styles';

export default function Home() {
    const router = useRouter();

    // Mode State
    const [mode, setMode] = useState<AppMode>('video');


    const [theme, setTheme] = useState<ThemeMode>('dark');

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Usage Help Text
    const HELP_TEXT = {
        video: (
            <div className="text-center mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-gray-400">
                    💡 <strong className="text-white">사용법:</strong> 영상을 업로드하면 AI가 주요 장면을 자동으로 찾아줍니다.<br />
                    원하는 장면을 선택하고 스타일을 골라 웹툰으로 변환해보세요! (최대 5장)
                </p>
            </div>
        ),
        photo: (
            <div className="text-center mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-gray-400">
                    💡 <strong className="text-white">사용법:</strong> 사진을 올리고 원하는 그림체를 선택하세요.<br />
                    AI가 멋진 웹툰 스타일로 바꿔드립니다! (최대 5장)
                </p>
            </div>
        ),
        gallery: (
            <div className="text-center mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-gray-400">
                    💡 <strong className="text-white">사용법:</strong> 변환된 이미지를 선택해서 삭제하거나,<br />
                    여러 장을 선택해 <strong className="text-[#CCFF00]">웹툰 보기</strong>로 이어볼 수 있습니다.
                </p>
            </div>
        )
    };

    // Photo Mode State (Multiple Selection)
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

    // Video Mode State
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
    const [selectedFrameIndices, setSelectedFrameIndices] = useState<number[]>([]);

    // Video Analysis State
    const [analyzing, setAnalyzing] = useState(false);
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

    // Speech Bubble Editor State
    const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
    const [editedImages, setEditedImages] = useState<Record<number, string>>({});

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Photo Mode: Handle multiple file selection
    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const imageFiles: File[] = [];
        const previews: string[] = [];

        const maxFiles = Math.min(files.length, 5 - photoPreviews.length);

        for (let i = 0; i < maxFiles; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) {
                message.error(`${file.name}은(는) 이미지 파일이 아닙니다.`);
                continue;
            }
            imageFiles.push(file);
            previews.push(URL.createObjectURL(file));
        }

        if (photoPreviews.length + previews.length > 5) {
            message.warning('최대 5장까지만 선택할 수 있습니다.');
        }

        setPhotoFiles(prev => [...prev, ...imageFiles]);
        setPhotoPreviews(prev => [...prev, ...previews]);
        setAiImages([]);

        // Reset input to allow selecting same file again
        e.target.value = '';
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

        // 1. Upload Limit: 50MB
        const MAX_SIZE_MB = 50;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            message.error(`동영상 용량은 ${MAX_SIZE_MB}MB 이하여야 합니다.`);
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

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        if (mode === 'photo') {
            const imageFiles: File[] = [];
            const previews: string[] = [];
            const maxFiles = Math.min(files.length, 5 - photoPreviews.length);

            for (let i = 0; i < maxFiles; i++) {
                const file = files[i];
                if (file.type.startsWith('image/')) {
                    imageFiles.push(file);
                    previews.push(URL.createObjectURL(file));
                }
            }

            if (previews.length > 0) {
                setPhotoFiles(prev => [...prev, ...imageFiles]);
                setPhotoPreviews(prev => [...prev, ...previews]);
                setAiImages([]);
            }

            if (photoPreviews.length + previews.length >= 5) {
                message.warning('최대 5장까지만 선택할 수 있습니다.');
            }
        } else if (mode === 'video') {
            processVideoFile(files[0]);
        }
    };

    // Video: Extract frames with basic scene change detection
    const handleVideoLoaded = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const duration = video.duration;

        // 3. Smart Extraction: Analyze more frames (20) and filter duplicates
        const analyzeCount = 20;
        const interval = duration / (analyzeCount + 1);
        const timestamps = Array.from({ length: analyzeCount }, (_, i) => interval * (i + 1));
        const frames: string[] = [];
        let previousImageData: ImageData | null = null;
        const DIFF_THRESHOLD = 30; // Threshold for scene change detection

        try {
            message.loading({ content: '주요 장면 심층 분석 중...', key: 'analyze' });

            for (const time of timestamps) {
                video.currentTime = time;
                await new Promise(resolve => {
                    video.onseeked = () => resolve(true);
                    setTimeout(resolve, 300); // Seek time optimization
                });

                if (ctx) {
                    canvas.width = 320; // Reduce resolution for faster analysis
                    canvas.height = (320 * video.videoHeight) / video.videoWidth;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    if (previousImageData) {
                        // Calculate difference
                        const diff = calculateImageDifference(previousImageData, currentImageData);
                        if (diff > DIFF_THRESHOLD) {
                            // Only add if significantly different
                            // Restore full quality for display
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            frames.push(canvas.toDataURL('image/jpeg', 0.8));
                        }
                    } else {
                        // Always keep first frame
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        frames.push(canvas.toDataURL('image/jpeg', 0.8));
                    }
                    previousImageData = currentImageData;
                }

                // Limit to 12 candidates to prevent overflow
                if (frames.length >= 12) break;
            }

            // Fallback if too few scenes found
            if (frames.length < 3) {
                // Try to fill with remaining timestamps if strict filtering removed too many
            }

            setExtractedFrames(frames);
            // Select up to 3 best candidates (start, middle, end)
            const autoSelectIndices = frames.length > 2
                ? [0, Math.floor(frames.length / 2), frames.length - 1]
                : frames.map((_, i) => i);
            setSelectedFrameIndices(autoSelectIndices.slice(0, 5)); // cap at 5 just in case

            message.success({ content: `분석 완료! ${frames.length}개의 주요 장면을 찾았습니다.`, key: 'analyze' });
        } catch (e) {
            console.error(e);
            message.error({ content: '장면 분석 실패', key: 'analyze' });
        } finally {
            setAnalyzing(false);
        }
    };

    // Helper: Simple Pixel Difference Calculation
    const calculateImageDifference = (img1: ImageData, img2: ImageData) => {
        const data1 = img1.data;
        const data2 = img2.data;
        let diff = 0;
        let count = 0;

        // Sampling for speed (check every 4th pixel)
        for (let i = 0; i < data1.length; i += 16) {
            const r = Math.abs(data1[i] - data2[i]);
            const g = Math.abs(data1[i + 1] - data2[i + 1]);
            const b = Math.abs(data1[i + 2] - data2[i + 2]);
            diff += (r + g + b) / 3;
            count++;
        }
        return diff / count;
    };

    const toggleFrameSelection = (idx: number) => {
        setSelectedFrameIndices(prev => {
            if (prev.includes(idx)) {
                return prev.filter(i => i !== idx);
            } else {
                // 2. Selection Limit: Max 5 Frames
                if (prev.length >= 5) {
                    message.warning('최대 5장까지만 선택할 수 있습니다.');
                    return prev;
                }
                return [...prev, idx];
            }
        });
    };

    // Convert Image(s)
    const handleConvert = async () => {
        let imagesToConvert: string[] = [];
        if (mode === 'photo') {
            if (photoPreviews.length === 0) {
                message.warning('먼저 사진을 업로드해 주세요!');
                return;
            }
            imagesToConvert = photoPreviews;
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
                const res = await fetch('/api/ai/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: compressedDataUrl,
                        styleId: selectedStyle.id,
                        userId: userId
                    })
                });
                const data = await res.json();

                if (data.success && data.image) {
                    setAiImages(prev => [...prev, data.image]);
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
        setPhotoFiles([]);
        setPhotoPreviews([]);
        setVideoFile(null);
        setExtractedFrames([]);
        setSelectedFrameIndices([]);
        setAiImages([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleModeChange = (m: AppMode) => {
        if (m === 'gallery') {
            router.push('/gallery');
        } else {
            setMode(m);
            handleReset();
        }
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

                {/* Help Text */}
                {HELP_TEXT[mode]}

                {/* Photo Mode */}
                {mode === 'photo' && (
                    <>
                        <GlassCard padding="lg">
                            {/* Upload Area - always show if under 5 photos */}
                            {photoPreviews.length < 5 && (
                                <label
                                    className="upload-area block cursor-pointer"
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    style={{
                                        borderColor: isDragging ? 'var(--accent-color)' : 'var(--border-color)',
                                        background: isDragging ? 'var(--accent-glow)' : 'transparent',
                                        marginBottom: photoPreviews.length > 0 ? '16px' : '0'
                                    }}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={handlePhotoSelect}
                                    />
                                    <div className="upload-icon">
                                        <span style={{ fontSize: '32px' }}>📷</span>
                                    </div>
                                    <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                        {photoPreviews.length === 0 ? '사진을 선택하세요!' : '사진 추가하기'}
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
                                        드래그 & 드롭 · 클릭 (최대 5장)
                                    </p>
                                </label>
                            )}

                            {/* Photo Grid Preview */}
                            {photoPreviews.length > 0 && (
                                <div>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '12px'
                                    }}>
                                        <p style={{ color: 'var(--accent-color)', fontWeight: 500, fontSize: '14px' }}>
                                            선택된 사진 ({photoPreviews.length}/5)
                                        </p>
                                        <button
                                            onClick={handleReset}
                                            style={{
                                                color: 'var(--text-muted)',
                                                fontSize: '13px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            전체 삭제
                                        </button>
                                    </div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '8px'
                                    }}>
                                        {photoPreviews.map((preview, idx) => (
                                            <div key={idx} style={{
                                                position: 'relative',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                aspectRatio: '1'
                                            }}>
                                                <img
                                                    src={preview}
                                                    alt={`Photo ${idx + 1}`}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
                                                        setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '4px',
                                                        right: '4px',
                                                        width: '22px',
                                                        height: '22px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(0,0,0,0.7)',
                                                        color: 'white',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        {photoPreviews.length > 0 && (
                            <>
                                <GlassCard>
                                    <StyleSelector selectedStyleId={selectedStyle.id} onStyleSelect={setSelectedStyle} />
                                </GlassCard>
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', width: '100%' }}>
                                    <button
                                        className="accent-btn"
                                        onClick={handleConvert}
                                        disabled={converting}
                                        style={{ width: '100%', maxWidth: '320px' }}
                                    >
                                        {converting ? `변환 중... ${progress}%` : `✨ ${photoPreviews.length}장 웹툰으로 변환하기`}
                                    </button>
                                </div>
                            </>
                        )}

                        {aiImages.length > 0 && (
                            <GlassCard>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <p style={{
                                        color: 'var(--accent-color)',
                                        fontWeight: 500,
                                        paddingLeft: '4px',
                                        margin: 0
                                    }}>변환 결과</p>
                                    <button
                                        onClick={async () => {
                                            try {
                                                for (let i = 0; i < aiImages.length; i++) {
                                                    const imageToSave = editedImages[i] || aiImages[i];
                                                    await fetch('/api/gallery', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            image: imageToSave,
                                                            userId: userId
                                                        })
                                                    });
                                                }
                                                message.success('갤러리에 저장되었습니다!');
                                            } catch (e) {
                                                message.error('저장 실패');
                                            }
                                        }}
                                        style={{
                                            background: 'var(--accent-color)',
                                            color: '#000',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        📁 갤러리 저장
                                    </button>
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '12px',
                                    padding: '4px'
                                }}>
                                    {aiImages.map((img, idx) => (
                                        <div key={idx} style={{
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}>
                                            <Image
                                                src={editedImages[idx] || img}
                                                alt={`Result ${idx}`}
                                                style={{ width: '100%' }}
                                                preview={{ mask: '크게 보기' }}
                                            />
                                            <div className="bubble-edit-overlay">
                                                <button
                                                    className="bubble-edit-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingImageIndex(idx);
                                                    }}
                                                >
                                                    💬 말풍선 추가
                                                </button>
                                            </div>
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
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', width: '100%' }}>
                                    <button
                                        className="accent-btn"
                                        onClick={handleConvert}
                                        disabled={converting}
                                        style={{ width: '100%', maxWidth: '320px' }}
                                    >
                                        {converting ? `변환 중... ${progress}%` : '✨ 웹툰으로 변환하기'}
                                    </button>
                                </div>
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
                                            overflow: 'hidden',
                                            position: 'relative'
                                        }}>
                                            <Image
                                                src={editedImages[idx] || img}
                                                alt={`Result ${idx}`}
                                                style={{ width: '100%' }}
                                                preview={{ mask: '크게 보기' }}
                                            />
                                            <div className="bubble-edit-overlay">
                                                <button
                                                    className="bubble-edit-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingImageIndex(idx);
                                                    }}
                                                >
                                                    💬 말풍선 추가
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        )}
                    </>
                )}
            </div>

            {/* Speech Bubble Editor Modal */}
            {editingImageIndex !== null && aiImages[editingImageIndex] && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.9)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <SpeechBubbleEditor
                            imageSrc={aiImages[editingImageIndex]}
                            suggestedText="대사를 입력하세요"
                            onSave={(compositeImageDataUrl) => {
                                setEditedImages(prev => ({
                                    ...prev,
                                    [editingImageIndex]: compositeImageDataUrl
                                }));
                                setEditingImageIndex(null);
                                message.success('말풍선이 추가되었습니다!');
                            }}
                            onCancel={() => setEditingImageIndex(null)}
                        />
                    </div>
                </div>
            )}
        </main>
    );
}