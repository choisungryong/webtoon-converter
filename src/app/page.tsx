'use client';

export const runtime = 'edge';
import { useState, useRef, useEffect } from 'react';
import { message, Progress, Image, Spin } from 'antd';
import { InboxOutlined, PlayCircleOutlined, CheckCircleFilled, LoadingOutlined } from '@ant-design/icons';
import axios from 'axios';

import Header, { AppMode } from '../components/Header';
import GlassCard from '../components/GlassCard';
import StyleSelector from '../components/StyleSelector';
import { STYLE_OPTIONS, StyleOption, DEFAULT_STYLE, getStyleById } from '../data/styles';

export default function Home() {
    // Mode State
    const [mode, setMode] = useState<AppMode>('photo');

    // Photo Mode State
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');

    // Video Mode State (기존)
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
    const [selectedFrameIndices, setSelectedFrameIndices] = useState<number[]>([]);

    // Common State
    const [selectedStyle, setSelectedStyle] = useState<StyleOption>(DEFAULT_STYLE);
    const [uploading, setUploading] = useState(false);
    const [converting, setConverting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [aiImages, setAiImages] = useState<string[]>([]);
    const [analyzing, setAnalyzing] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            console.error(e);
            message.error({ content: '장면 분석 실패', key: 'analyze' });
        } finally {
            setAnalyzing(false);
        }
    };

    const toggleFrameSelection = (idx: number) => {
        setSelectedFrameIndices(prev => {
            if (prev.includes(idx)) {
                return prev.filter(i => i !== idx);
            } else {
                return [...prev, idx];
            }
        });
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
        } else {
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
            message.loading({ content: '웹툰으로 변환 중...', key: 'convert' });

            for (let i = 0; i < imagesToConvert.length; i++) {
                const imgSrc = imagesToConvert[i];

                // Rate limit delay
                if (i > 0) {
                    message.loading({ content: `속도 제한 준수 중... (10초 대기)`, key: 'rate', duration: 10 });
                    await new Promise(r => setTimeout(r, 10000));
                }

                // Resize/compress image
                const compressedDataUrl = await compressImage(imgSrc);

                // Call API with style
                const res = await axios.post('/api/ai/start', {
                    image: compressedDataUrl,
                    styleId: selectedStyle.id
                });

                if (res.data.success && res.data.image) {
                    setAiImages(prev => [...prev, res.data.image]);
                    setProgress(Math.round(((i + 1) / imagesToConvert.length) * 100));
                } else {
                    throw new Error(res.data.error || '변환 실패');
                }
            }

            message.success({ content: '변환 완료!', key: 'convert' });
            message.destroy('rate');

        } catch (e: any) {
            console.error(e);
            message.error(`오류: ${e.message}`);
        } finally {
            setConverting(false);
        }
    };

    // Image compression helper
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
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            img.onerror = () => reject(new Error('이미지 로드 실패'));
            img.src = src;
        });
    };

    // Reset
    const handleReset = () => {
        setPhotoFile(null);
        setPhotoPreview('');
        setVideoFile(null);
        setExtractedFrames([]);
        setSelectedFrameIndices([]);
        setAiImages([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center p-4 md:p-8">
            <video ref={videoRef} style={{ display: 'none' }} onLoadedData={handleVideoLoaded} crossOrigin="anonymous" muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="w-full max-w-2xl space-y-6">
                {/* Header */}
                <Header mode={mode} onModeChange={(m) => { setMode(m); handleReset(); }} />

                {/* Upload Area */}
                <GlassCard padding="lg">
                    {mode === 'photo' ? (
                        // Photo Mode
                        !photoPreview ? (
                            <label className="upload-area block cursor-pointer">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handlePhotoSelect}
                                />
                                <InboxOutlined style={{ fontSize: '48px', color: '#CCFF00' }} />
                                <p className="text-white font-bold mt-4">사진 한 장을 드래그하거나 클릭하세요!</p>
                                <p className="text-gray-500 text-sm mt-2">JPG, PNG, WebP 지원</p>
                            </label>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative">
                                    <img
                                        src={photoPreview}
                                        alt="Preview"
                                        className="w-full rounded-lg max-h-[300px] object-contain mx-auto"
                                    />
                                    <button
                                        onClick={handleReset}
                                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )
                    ) : (
                        // Video Mode
                        !videoFile ? (
                            <label className="upload-area block cursor-pointer">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="video/*"
                                    style={{ display: 'none' }}
                                    onChange={handleVideoSelect}
                                />
                                <PlayCircleOutlined style={{ fontSize: '48px', color: '#CCFF00' }} />
                                <p className="text-white font-bold mt-4">영상 파일을 드래그하거나 클릭하세요!</p>
                                <p className="text-gray-500 text-sm mt-2">MP4, MOV, WebM 지원</p>
                            </label>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-white">
                                        <PlayCircleOutlined style={{ fontSize: '24px', color: '#CCFF00', marginRight: '10px' }} />
                                        <span className="truncate max-w-[200px]">{videoFile.name}</span>
                                    </div>
                                    <button
                                        onClick={handleReset}
                                        className="px-3 py-1 rounded bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                                    >
                                        변경
                                    </button>
                                </div>

                                {analyzing && (
                                    <div className="flex items-center justify-center py-4">
                                        <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#CCFF00' }} />} />
                                        <span className="ml-3 text-gray-400">장면 분석 중...</span>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </GlassCard>

                {/* Frame Selection (Video Mode) */}
                {mode === 'video' && extractedFrames.length > 0 && (
                    <GlassCard>
                        <h3 className="text-[#CCFF00] font-medium mb-4">
                            장면 선택 ({selectedFrameIndices.length}개)
                        </h3>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                            {extractedFrames.map((frame, idx) => {
                                const isSelected = selectedFrameIndices.includes(idx);
                                return (
                                    <div
                                        key={idx}
                                        className="relative aspect-square cursor-pointer group overflow-hidden rounded-md"
                                        onClick={() => toggleFrameSelection(idx)}
                                    >
                                        <img
                                            src={frame}
                                            alt={`Scene ${idx}`}
                                            className={`w-full h-full object-cover transition-all duration-200 ${isSelected ? 'brightness-110' : 'brightness-75 group-hover:brightness-100'}`}
                                        />
                                        <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                            ${isSelected ? 'bg-[#CCFF00] border-[#CCFF00]' : 'border-white/50 bg-black/30'}`}>
                                            {isSelected && <CheckCircleFilled className="text-black text-xs" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>
                )}

                {/* Style Selector */}
                {((mode === 'photo' && photoPreview) || (mode === 'video' && selectedFrameIndices.length > 0)) && (
                    <GlassCard>
                        <StyleSelector
                            selectedStyleId={selectedStyle.id}
                            onStyleSelect={setSelectedStyle}
                        />
                    </GlassCard>
                )}

                {/* Convert Button */}
                {((mode === 'photo' && photoPreview) || (mode === 'video' && selectedFrameIndices.length > 0)) && (
                    <button
                        className="accent-btn w-full"
                        onClick={handleConvert}
                        disabled={converting}
                    >
                        {converting ? (
                            <>
                                <LoadingOutlined className="mr-2" />
                                변환 중... {progress}%
                            </>
                        ) : (
                            '✨ 웹툰으로 변환하기'
                        )}
                    </button>
                )}

                {/* Progress */}
                {converting && (
                    <Progress
                        percent={progress}
                        strokeColor="#CCFF00"
                        trailColor="#333"
                        showInfo={false}
                    />
                )}

                {/* Results */}
                {aiImages.length > 0 && (
                    <GlassCard>
                        <h3 className="text-[#CCFF00] font-medium mb-4">변환 결과</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {aiImages.map((img, idx) => (
                                <Image
                                    key={idx}
                                    src={img}
                                    alt={`Result ${idx}`}
                                    className="rounded-lg"
                                />
                            ))}
                        </div>
                    </GlassCard>
                )}
            </div>
        </main>
    );
}