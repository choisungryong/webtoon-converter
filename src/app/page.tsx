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
import SketchLottieAnimation from '../components/SketchLottieAnimation';
import WebtoonViewer from '../components/WebtoonViewer';
import { StyleOption, DEFAULT_STYLE } from '../data/styles';
import type { PanelLayout } from '../types/layout';

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
                    원하는 장면을 선택하고 스타일을 골라 웹툰으로 변환해보세요! (최대 10장)
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
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [totalImagesToConvert, setTotalImagesToConvert] = useState(0);
    const [aiImages, setAiImages] = useState<string[]>([]);

    // Speech Bubble Editor State
    const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
    const [editedImages, setEditedImages] = useState<Record<number, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);
    const [isSaved, setIsSaved] = useState(false);
    const [selectedResultIndices, setSelectedResultIndices] = useState<number[]>([]);

    // Toggle result image selection
    const toggleResultSelection = (idx: number) => {
        setSelectedResultIndices(prev =>
            prev.includes(idx)
                ? prev.filter(i => i !== idx)
                : [...prev, idx]
        );
    };

    // Select all result images
    const selectAllResults = () => {
        if (selectedResultIndices.length === aiImages.length) {
            setSelectedResultIndices([]);
        } else {
            setSelectedResultIndices(aiImages.map((_, i) => i));
        }
    };

    // Smart Layout State
    const [smartLayoutEnabled, setSmartLayoutEnabled] = useState(false);
    const [panelLayouts, setPanelLayouts] = useState<PanelLayout[]>([]);
    const [analyzingLayout, setAnalyzingLayout] = useState(false);

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
            const video = videoRef.current;
            const objectUrl = URL.createObjectURL(file);
            video.src = objectUrl;

            // 모바일 브라우저를 위한 강화된 로딩 로직
            const loadVideo = () => {
                video.load();
                setAnalyzing(true);
            };

            // 이벤트 리스너 추가 (한 번만 실행)
            video.onloadedmetadata = () => {
                console.log('Video metadata loaded:', video.duration, video.videoWidth, video.videoHeight);
            };

            video.onerror = (e) => {
                console.error('Video load error:', e);
                message.error({
                    content: '영상을 불러올 수 없습니다. 클라우드 파일이 아닌 휴대폰에 저장된 영상을 선택해주세요.',
                    duration: 5
                });
                setAnalyzing(false);
                setVideoFile(null);
            };

            loadVideo();
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
        if (!videoRef.current || !canvasRef.current) {
            message.error('영상 로드 실패: 비디오 요소를 찾을 수 없습니다.');
            setAnalyzing(false);
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const duration = video.duration;

        // 영상 유효성 검사
        if (!duration || duration === Infinity || isNaN(duration)) {
            message.error({
                content: '영상을 분석할 수 없습니다. 클라우드 파일이 아닌 휴대폰에 저장된 영상을 선택해주세요.',
                duration: 5
            });
            setAnalyzing(false);
            setVideoFile(null);
            return;
        }

        if (!video.videoWidth || !video.videoHeight) {
            message.error({
                content: '영상 정보를 읽을 수 없습니다. 클라우드 파일이 아닌 휴대폰에 저장된 영상을 선택해주세요.',
                duration: 5
            });
            setAnalyzing(false);
            setVideoFile(null);
            return;
        }

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

            // Auto-select: start, 2+ scene-changed middle frames, end (at least 4 frames)
            let autoSelectIndices: number[] = [];

            if (frames.length >= 4) {
                // Start
                autoSelectIndices.push(0);

                // Select 2+ middle frames (evenly distributed, excluding first and last)
                const middleIndices = [];
                for (let i = 1; i < frames.length - 1; i++) {
                    middleIndices.push(i);
                }

                // Pick at least 2 middle frames, evenly spaced
                const middleCount = Math.max(2, Math.min(middleIndices.length, 4)); // 2-4 middle frames
                const step = middleIndices.length / middleCount;
                for (let i = 0; i < middleCount; i++) {
                    const idx = middleIndices[Math.floor(i * step)];
                    if (!autoSelectIndices.includes(idx)) {
                        autoSelectIndices.push(idx);
                    }
                }

                // End
                autoSelectIndices.push(frames.length - 1);

                // Sort by index order
                autoSelectIndices.sort((a, b) => a - b);
            } else if (frames.length === 3) {
                // If only 3 frames, select all
                autoSelectIndices = [0, 1, 2];
            } else {
                // If less than 3 frames, select all
                autoSelectIndices = frames.map((_, i) => i);
            }

            setSelectedFrameIndices(autoSelectIndices.slice(0, 10)); // cap at 10

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
                // 2. Selection Limit: Max 10 Frames
                if (prev.length >= 10) {
                    message.warning('최대 10장까지만 선택할 수 있습니다.');
                    return prev;
                }
                return [...prev, idx];
            }
        });
    };

    // Convert Image(s) - Photo mode only (Video uses handlePremiumVideoConvert)
    const handleConvert = async () => {
        if (mode !== 'photo') return;

        if (photoPreviews.length === 0) {
            message.warning('먼저 사진을 업로드해 주세요!');
            return;
        }

        const imagesToConvert = photoPreviews;
        setConverting(true);
        setProgress(0);
        setTotalImagesToConvert(imagesToConvert.length);
        setCurrentImageIndex(0);

        const generatedImages: string[] = [];

        try {
            // Step 1: AI 변환
            for (let i = 0; i < imagesToConvert.length; i++) {
                setCurrentImageIndex(i + 1);
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

                // Handle specific error types
                if (data.error === 'DAILY_LIMIT_EXCEEDED') {
                    message.warning({
                        content: data.message || `오늘의 무료 변환 한도(${data.limit || 30}장)를 초과했습니다. 내일 다시 이용해주세요!`,
                        duration: 6
                    });
                    break;
                }

                if (data.error === 'QUOTA_EXCEEDED') {
                    message.warning({
                        content: data.message || '서비스 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
                        duration: 6
                    });
                    break;
                }

                if (data.error) {
                    throw new Error(data.error);
                }

                if (data.success && data.image) {
                    generatedImages.push(data.image);
                    setProgress(Math.round(((i + 1) / imagesToConvert.length) * 80)); // 0-80% for conversion
                }
            }

            if (generatedImages.length === 0) {
                throw new Error('변환된 이미지가 없습니다.');
            }

            // Step 2: 자동 저장
            message.loading({ content: '갤러리에 저장 중...', key: 'photo-save' });
            setProgress(90);

            for (const img of generatedImages) {
                await fetch('/api/gallery', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: img,
                        userId: userId
                    })
                });
            }

            setProgress(100);
            message.success({ content: `${generatedImages.length}장 변환 완료!`, key: 'photo-save' });

            // Step 3: 갤러리 마이스냅 탭으로 이동하며 결과 팝업 표시
            router.push('/gallery?tab=image&showResult=true');

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
                let canvas: HTMLCanvasElement | null = document.createElement('canvas');
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
                const ctx = canvas.getContext('2d', { willReadFrequently: false });
                ctx?.drawImage(img, 0, 0, width, height);
                const result = canvas.toDataURL('image/jpeg', 0.90);

                // Explicitly release memory
                canvas.width = 0;
                canvas.height = 0;
                canvas = null;
                img.src = '';
                img.onload = null;
                img.onerror = null;

                resolve(result);
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
        setIsSaved(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Webtoon Episode Convert - Convert each frame individually, then stitch vertically
    const handlePremiumVideoConvert = async () => {
        if (selectedFrameIndices.length === 0) {
            message.warning('변환할 장면을 선택해 주세요!');
            return;
        }

        // 추출된 프레임이 2장 미만인 경우
        if (extractedFrames.length < 2) {
            message.warning({
                content: '영상이 너무 짧아 2장 이상의 장면을 추출할 수 없습니다. 더 긴 영상을 업로드해 주세요!',
                duration: 5
            });
            return;
        }

        if (selectedFrameIndices.length < 2) {
            message.warning('웹툰을 만들려면 최소 2장 이상의 장면을 선택해 주세요!');
            return;
        }

        const imagesToConvert = selectedFrameIndices.map(idx => extractedFrames[idx]);
        setConverting(true);
        setProgress(0);
        setTotalImagesToConvert(imagesToConvert.length);
        setCurrentImageIndex(0);

        const convertedImages: string[] = [];

        try {
            message.loading({ content: `${imagesToConvert.length}장 변환 시작...`, key: 'episode' });

            // Step 1: Convert each frame individually using existing AI API
            for (let i = 0; i < imagesToConvert.length; i++) {
                setCurrentImageIndex(i + 1);
                message.loading({ content: `${i + 1}/${imagesToConvert.length} 변환 중...`, key: 'episode' });

                if (i > 0) await new Promise(r => setTimeout(r, 10000)); // API rate limit

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

                if (data.error === 'DAILY_LIMIT_EXCEEDED' || data.error === 'QUOTA_EXCEEDED') {
                    message.warning({ content: data.message || 'API 한도 초과', key: 'episode' });
                    break;
                }

                if (data.error) {
                    throw new Error(data.error);
                }

                if (data.success && data.image) {
                    convertedImages.push(data.image);
                }

                setProgress(Math.round(((i + 1) / imagesToConvert.length) * 70)); // 0-70% for conversion
            }

            if (convertedImages.length < 2) {
                throw new Error('변환된 이미지가 부족합니다.');
            }

            // Step 2: Stitch images vertically
            message.loading({ content: '이미지 합치는 중...', key: 'episode' });
            setProgress(75);

            const stitchedImage = await stitchImagesVertically(convertedImages);

            // Step 3: Save to My Webtoon
            message.loading({ content: '마이웹툰에 저장 중...', key: 'episode' });
            setProgress(90);

            const saveRes = await fetch('/api/webtoon/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: stitchedImage,
                    userId: userId
                })
            });

            if (!saveRes.ok) {
                const errData = await saveRes.json().catch(() => ({}));
                throw new Error(errData.message || '저장 실패');
            }

            setProgress(100);
            message.success({ content: `${convertedImages.length}장 에피소드 생성 완료!`, key: 'episode', duration: 3 });

            // 모바일에서 라우터 이동 전 약간의 딜레이 추가
            await new Promise(r => setTimeout(r, 500));

            // 갤러리 마이웹툰 탭으로 이동하며 결과 팝업 표시
            router.push('/gallery?tab=webtoon&showResult=true');

        } catch (e: any) {
            console.error('Video convert error:', e);
            message.error({
                content: `변환 오류: ${e.message || '알 수 없는 오류가 발생했습니다'}`,
                key: 'episode',
                duration: 5
            });

            // 에러 발생해도 상태 유지 (초기화하지 않음)
            // 사용자가 다시 시도할 수 있도록 함
        } finally {
            setConverting(false);
        }
    };

    // Helper: Stitch images vertically (800px width, variable height)
    // Memory-optimized for mobile: sequential loading + immediate canvas release
    const stitchImagesVertically = async (imageUrls: string[]): Promise<string> => {
        const TARGET_WIDTH = 800;
        let canvas: HTMLCanvasElement | null = null;

        try {
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

            // Phase 1: Calculate dimensions first (lightweight - just get sizes)
            const dimensions: { width: number; height: number; scaledHeight: number }[] = [];
            let totalHeight = 0;

            for (const url of imageUrls) {
                const img = await loadImage(url);
                const scale = TARGET_WIDTH / img.width;
                const scaledHeight = Math.round(img.height * scale);
                dimensions.push({ width: img.width, height: img.height, scaledHeight });
                totalHeight += scaledHeight;
                // Release image reference immediately
                img.src = '';
                img.onload = null;
                img.onerror = null;
            }

            // Mobile memory limit check (lower threshold for safety)
            if (totalHeight > 8000) {
                throw new Error('이미지가 너무 깁니다. 선택한 장면 수를 줄여주세요.');
            }

            // Phase 2: Create canvas and draw images sequentially
            canvas = document.createElement('canvas');
            canvas.width = TARGET_WIDTH;
            canvas.height = totalHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: false });

            if (!ctx) throw new Error('Canvas를 생성할 수 없습니다.');

            let currentY = 0;
            for (let i = 0; i < imageUrls.length; i++) {
                const img = await loadImage(imageUrls[i]);
                const { scaledHeight } = dimensions[i];

                // Draw immediately
                ctx.drawImage(img, 0, currentY, TARGET_WIDTH, scaledHeight);
                currentY += scaledHeight;

                // Release image reference immediately after drawing
                img.src = '';
                img.onload = null;
                img.onerror = null;

                // Give browser a chance to GC between images
                await new Promise(r => setTimeout(r, 10));
            }

            // Get result with lower quality for mobile
            const result = canvas.toDataURL('image/jpeg', 0.80);

            // Validate result
            if (!result || result === 'data:,' || result.length < 1000) {
                throw new Error('이미지 생성에 실패했습니다. 메모리가 부족할 수 있습니다.');
            }

            return result;
        } catch (e: any) {
            throw new Error(`이미지 합치기 실패: ${e.message}`);
        } finally {
            // Explicitly release canvas memory
            if (canvas) {
                canvas.width = 0;
                canvas.height = 0;
                canvas = null;
            }
        }
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

            <div style={{ width: '100%', maxWidth: '640px', overflow: 'hidden' }}>
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
                        {/* Step 1: 사진 업로드 가이드 */}
                        {photoPreviews.length === 0 && (
                            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">1</span>
                                <span className="text-blue-400 text-sm">먼저 변환할 사진을 선택해주세요</span>
                            </div>
                        )}
                        <GlassCard padding={photoPreviews.length > 0 ? 'md' : 'lg'}>
                            {/* Upload Area - compact when photos selected */}
                            {photoPreviews.length < 5 && (
                                <label
                                    className="upload-area block cursor-pointer"
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    style={{
                                        borderColor: isDragging ? 'var(--accent-color)' : 'var(--border-color)',
                                        background: isDragging ? 'var(--accent-glow)' : 'transparent',
                                        marginBottom: photoPreviews.length > 0 ? '12px' : '0',
                                        padding: photoPreviews.length > 0 ? '12px' : '32px'
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
                                    {photoPreviews.length === 0 ? (
                                        <>
                                            <div className="upload-icon">
                                                <span style={{ fontSize: '32px' }}>📷</span>
                                            </div>
                                            <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                                사진을 선택하세요!
                                            </p>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
                                                드래그 & 드롭 · 클릭 (최대 5장)
                                            </p>
                                        </>
                                    ) : (
                                        <p style={{ color: 'var(--accent-color)', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>➕</span> 사진 추가하기 ({5 - photoPreviews.length}장 더 가능)
                                        </p>
                                    )}
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
                                {/* Step 2: 스타일 선택 가이드 */}
                                {aiImages.length === 0 && (
                                    <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold">2</span>
                                        <span className="text-purple-400 text-sm">원하는 웹툰 스타일을 선택하세요</span>
                                    </div>
                                )}
                                <GlassCard>
                                    <StyleSelector selectedStyleId={selectedStyle.id} onStyleSelect={setSelectedStyle} />
                                </GlassCard>

                                {/* Conversion Animation or Button */}
                                {converting ? (
                                    <GlassCard>
                                        <SketchLottieAnimation
                                            progress={progress}
                                            currentImage={currentImageIndex}
                                            totalImages={totalImagesToConvert}
                                        />
                                    </GlassCard>
                                ) : (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', width: '100%' }}>
                                        <button
                                            className="accent-btn"
                                            onClick={handleConvert}
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
                )}

                {/* Video Mode */}
                {mode === 'video' && (
                    <>
                        {/* Step 1: 영상 업로드 가이드 */}
                        {!videoFile && (
                            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">1</span>
                                <span className="text-blue-400 text-sm">먼저 변환할 영상을 선택해주세요</span>
                            </div>
                        )}
                        <GlassCard padding="lg">
                            {!videoFile ? (
                                <div
                                    className="upload-area"
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    style={{
                                        borderColor: isDragging ? 'var(--accent-color)' : 'var(--border-color)',
                                        background: isDragging ? 'var(--accent-glow)' : 'transparent'
                                    }}
                                >
                                    {/* Hidden file inputs */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
                                        style={{ display: 'none' }}
                                        onChange={handleVideoSelect}
                                    />
                                    <input
                                        id="cameraInput"
                                        type="file"
                                        accept="video/*"
                                        capture="environment"
                                        style={{ display: 'none' }}
                                        onChange={handleVideoSelect}
                                    />

                                    <div className="upload-icon">
                                        <span style={{ fontSize: '32px' }}>🎬</span>
                                    </div>
                                    <p className="font-bold text-lg" style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
                                        영상을 선택하세요!
                                    </p>

                                    {/* Two separate buttons for mobile */}
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                padding: '12px 24px',
                                                borderRadius: '12px',
                                                background: 'var(--accent-color)',
                                                color: 'black',
                                                fontWeight: 600,
                                                fontSize: '14px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            📁 갤러리에서 선택
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => document.getElementById('cameraInput')?.click()}
                                            style={{
                                                padding: '12px 24px',
                                                borderRadius: '12px',
                                                background: 'transparent',
                                                color: 'var(--accent-color)',
                                                fontWeight: 600,
                                                fontSize: '14px',
                                                border: '2px solid var(--accent-color)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            📹 영상 촬영
                                        </button>
                                    </div>

                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '12px' }}>
                                        MP4, MOV, WebM (최대 50MB)
                                    </p>
                                    <p style={{
                                        color: '#f59e0b',
                                        fontSize: '12px',
                                        marginTop: '8px',
                                        padding: '8px 12px',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(245, 158, 11, 0.3)'
                                    }}>
                                        ⚠️ 구글 드라이브, 클라우드 파일은 지원되지 않습니다.<br />
                                        <span style={{ color: 'var(--text-muted)' }}>휴대폰에 저장된 영상만 선택해주세요.</span>
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p style={{ color: 'var(--text-primary)' }}>{videoFile.name}</p>
                                    {analyzing && <Spin className="mt-2" />}
                                </div>
                            )}
                        </GlassCard>

                        {extractedFrames.length > 0 && (
                            <>
                                {/* Step 2: 장면 선택 가이드 */}
                                {aiImages.length === 0 && (
                                    <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold">2</span>
                                        <span className="text-orange-400 text-sm">변환할 장면을 클릭해서 선택하세요 (최대 10장)</span>
                                    </div>
                                )}
                                <GlassCard>
                                    <p style={{
                                        color: 'var(--accent-color)',
                                        fontWeight: 500,
                                        marginBottom: '12px'
                                    }}>
                                        장면 선택 ({selectedFrameIndices.length}/10)
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
                                {/* Step 3: 스타일 선택 가이드 */}
                                {aiImages.length === 0 && (
                                    <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold">3</span>
                                        <span className="text-purple-400 text-sm">원하는 웹툰 스타일을 선택하고 변환 버튼을 누르세요</span>
                                    </div>
                                )}
                                <GlassCard>
                                    <StyleSelector selectedStyleId={selectedStyle.id} onStyleSelect={setSelectedStyle} />
                                </GlassCard>

                                {/* Conversion Animation or Button */}
                                {converting ? (
                                    <GlassCard>
                                        <SketchLottieAnimation
                                            progress={progress}
                                            currentImage={currentImageIndex}
                                            totalImages={totalImagesToConvert}
                                        />
                                    </GlassCard>
                                ) : (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', width: '100%' }}>
                                        <button
                                            className="accent-btn"
                                            onClick={handlePremiumVideoConvert}
                                            disabled={converting}
                                            style={{
                                                width: '100%',
                                                maxWidth: '320px',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                color: 'white'
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
                                {/* Step 4: 결과 확인 가이드 */}
                                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold">4</span>
                                    <span className="text-green-400 text-sm">변환 완료! 💬 말풍선을 추가하고 갤러리에 저장하세요</span>
                                </div>
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
                                                if (isSaving || isSaved) return;
                                                setIsSaving(true);
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
                                                    message.success('갤러리에 저장되었습니다.');
                                                    setIsSaved(true);
                                                } catch (e) {
                                                    message.error('저장 실패');
                                                } finally {
                                                    setIsSaving(false);
                                                }
                                            }}
                                            disabled={isSaving || isSaved}
                                            className={`transition-transform ${!isSaved && !isSaving ? 'hover:scale-105 active:scale-95' : ''}`}
                                            style={{
                                                background: isSaving || isSaved ? '#333' : 'var(--accent-color)',
                                                color: isSaved ? '#fff' : '#000',
                                                border: isSaved ? '1px solid #555' : 'none',
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: (isSaving || isSaved) ? 'default' : 'pointer',
                                                opacity: isSaving ? 0.7 : 1
                                            }}
                                        >
                                            {isSaving ? '⏳ 저장 중...' : isSaved ? '✅ 저장 완료' : '📁 갤러리 저장'}
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
                                                        {editedImages[idx] ? '✏️ 말풍선 수정' : '💬 말풍선 추가'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>
                            </>
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