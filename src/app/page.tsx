'use client';

export const runtime = 'edge';
import { useState, useRef, useEffect } from 'react';
import { Button, Upload, message, Card, ConfigProvider, theme, Progress, Row, Col, Image } from 'antd';
import { ThunderboltOutlined, InboxOutlined, PlayCircleOutlined, CheckCircleFilled, CheckCircleOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import axios from 'axios';

const { Dragger } = Upload;

export default function Home() {
    const [fileList, setFileList] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [converting, setConverting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [selectedFrameIndices, setSelectedFrameIndices] = useState<number[]>([]);
    const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
    const [aiImages, setAiImages] = useState<string[]>([]);
    const [analyzing, setAnalyzing] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Analyze video when file is selected
    useEffect(() => {
        if (fileList.length > 0) {
            const file = fileList[0].originFileObj || fileList[0];
            if (videoRef.current && file) {
                const url = URL.createObjectURL(file);
                videoRef.current.src = url;
                videoRef.current.load();
                setAnalyzing(true);
                setExtractedFrames([]);
                setSelectedFrameIndices([]); // Reset selection
                setAiImages([]);
            }
        }
    }, [fileList]);

    const handleVideoLoaded = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const duration = video.duration;

        // Extract 12 frames
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
            setSelectedFrameIndices([0, 1, 2]); // Default selection
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

    const handleUploadAndConvert = async () => {
        const file = fileList[0];
        if (!file) {
            message.warning('먼저 영상 파일을 선택해 주세요!');
            return;
        }

        setUploading(true);
        setConverting(true);
        setProgress(0);
        setAiImages([]);

        try {
            // 1. Get Presigned URL & Upload Video (Optimize: Do this only once)
            message.loading({ content: '영상 업로드 중...', key: 'upload' });

            const { data: presignedData } = await axios.post('/api/upload-url', {
                filename: file.name,
                fileType: file.type
            });

            if (!presignedData.success) throw new Error(presignedData.error || 'URL 생성 실패');

            await axios.put(presignedData.uploadUrl, file.originFileObj || file, {
                headers: { 'Content-Type': file.type },
                onUploadProgress: (ev) => {
                    if (ev.total) setProgress(Math.round((ev.loaded * 100) / ev.total));
                }
            });
            await axios.post('/api/upload-complete', { fileId: presignedData.fileId });

            message.success({ content: '업로드 완료! AI 변환 시작...', key: 'upload' });
            setUploading(false); // Done uploading

            // 2. AI Conversion Loop (Parallel Batching - 3 at a time)
            const targets = selectedFrameIndices.map(idx => extractedFrames[idx]);
            const newImages: string[] = [];

            // Helper function for single conversion
            const processBatch = async (batch: string[], startIndex: number) => {
                const promises = batch.map(async (imgSrc, batchIdx) => {
                    const globalIdx = startIndex + batchIdx;
                    try {
                        const blob = await (await fetch(imgSrc)).blob();
                        const formData = new FormData();
                        formData.append('image', blob);

                        // A. Start
                        const startRes = await axios.post('/api/ai/start', formData);
                        const { predictionId } = startRes.data;
                        if (!predictionId) throw new Error('Start Failed');

                        // B. Poll
                        let finalUrl = null;
                        for (let k = 0; k < 45; k++) { // 45 * 2s = 90s max
                            await new Promise(r => setTimeout(r, 2000));
                            const statusRes = await axios.get(`/api/ai/status?id=${predictionId}&prompt=webtoon`);
                            if (statusRes.data.status === 'succeeded') {
                                finalUrl = statusRes.data.image;
                                break;
                            } else if (statusRes.data.status === 'failed') {
                                throw new Error('AI Failed');
                            }
                        }
                        if (finalUrl) return { idx: globalIdx, url: finalUrl, success: true };
                        throw new Error('Timeout');
                    } catch (e: any) {
                        return { idx: globalIdx, error: e.message, success: false };
                    }
                });
                return await Promise.all(promises);
            };

            const BATCH_SIZE = 3;
            for (let i = 0; i < targets.length; i += BATCH_SIZE) {
                const batch = targets.slice(i, i + BATCH_SIZE);
                message.loading({ content: `배치 변환 중... (${i + 1}~${Math.min(i + BATCH_SIZE, targets.length)}/${targets.length})`, key: 'ai' });

                const results = await processBatch(batch, i);

                // Process results
                results.forEach(res => {
                    if (res.success) {
                        newImages.push(res.url!);
                    } else {
                        message.error(`장면 ${res.idx! + 1} 실패: ${res.error}`);
                    }
                });

                // Update UI incrementally
                setAiImages(prev => [...prev, ...results.filter(r => r.success).map(r => r.url!)]);
            }

            message.success({ content: '모든 변환 완료!', key: 'ai' });

        } catch (e: any) {
            console.error(e);
            message.error(`오류: ${e.message}`);
        } finally {
            setUploading(false);
            setConverting(false);
        }
    };

    const uploadProps: UploadProps = {
        onRemove: () => { setFileList([]); setExtractedFrames([]); setAiImages([]); },
        beforeUpload: (file) => {
            if (!file.type.startsWith('video/')) {
                message.error('동영상만 가능합니다.');
                return Upload.LIST_IGNORE;
            }
            setFileList([file]);
            return false;
        },
        fileList,
        maxCount: 1,
        showUploadList: false
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: { colorPrimary: '#CCFF00', colorBgContainer: '#141414' }
            }}
        >
            <main className="min-h-screen bg-black flex flex-col items-center p-4 md:p-8">
                <video ref={videoRef} style={{ display: 'none' }} onLoadedData={handleVideoLoaded} crossOrigin="anonymous" muted />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <div className="w-full max-w-2xl space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#CCFF00] to-green-400">
                            WEBTOON CONVERTER
                        </h1>
                    </div>

                    {/* 1. Compact Video Upload */}
                    <Card
                        size="small"
                        bordered={false}
                        className="shadow-xl shadow-[#CCFF00]/5"
                        style={{ background: '#1c1c1c' }}
                    >
                        {fileList.length === 0 ? (
                            <Dragger {...uploadProps} style={{ padding: '20px', border: 'none' }}>
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined style={{ color: '#CCFF00', fontSize: '32px' }} />
                                </p>
                                <p className="text-white font-bold">영상 업로드 (Click)</p>
                            </Dragger>
                        ) : (
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center text-white">
                                    <PlayCircleOutlined style={{ fontSize: '24px', color: '#CCFF00', marginRight: '10px' }} />
                                    <span className="truncate max-w-[200px]">{fileList[0].name}</span>
                                </div>
                                <Button danger size="small" onClick={() => { setFileList([]); setExtractedFrames([]); }}>
                                    변경
                                </Button>
                            </div>
                        )}
                        {uploading && <Progress percent={progress} strokeColor="#CCFF00" status="active" showInfo={false} className="px-4 pb-2" />}
                    </Card>

                    {/* 2. Scene Selection (Google Photos Style) - Stacked Below */}
                    {extractedFrames.length > 0 && (
                        <Card title={<span className="text-[#CCFF00]">장면 선택 ({selectedFrameIndices.length})</span>} size="small" bordered={false} style={{ background: '#1c1c1c' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                gap: '8px',
                                marginBottom: '16px'
                            }}>
                                {extractedFrames.map((frame, idx) => {
                                    const isSelected = selectedFrameIndices.includes(idx);
                                    return (
                                        <div
                                            key={idx}
                                            className="relative aspect-square cursor-pointer group"
                                            onClick={() => toggleFrameSelection(idx)}
                                        >
                                            <img
                                                src={frame}
                                                alt={`Scene ${idx}`}
                                                className={`w-full h-full object-cover rounded-md transition-all duration-200 ${isSelected ? 'brightness-110' : 'brightness-90 group-hover:brightness-100'}`}
                                            />

                                            {/* Google Photos Style Selection Ring */}
                                            <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
                                                ${isSelected ? 'bg-[#CCFF00] border-[#CCFF00]' : 'border-white/50 bg-black/10 group-hover:border-white/80'}`}>
                                                {isSelected && <CheckCircleFilled className="text-black text-xs" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <Button
                                type="primary" block size="large"
                                onClick={handleUploadAndConvert}
                                loading={uploading || converting}
                                disabled={selectedFrameIndices.length === 0}
                                style={{ height: '48px', fontWeight: 'bold' }}
                            >
                                {converting ? '변환 중...' : '변환하기'}
                            </Button>
                        </Card>
                    )}

                    {/* 3. Results */}
                    {aiImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                            {aiImages.map((img, idx) => (
                                <Image key={idx} src={img} alt={`Result ${idx}`} className="rounded-lg shadow-lg border border-[#333]" />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </ConfigProvider>
    );
}