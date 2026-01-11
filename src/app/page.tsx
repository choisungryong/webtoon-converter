'use client';

export const runtime = 'edge';
import { useState, useRef, useEffect } from 'react';
import { Button, Upload, message, Card, ConfigProvider, theme, Progress, Row, Col, Image } from 'antd';
import { ThunderboltOutlined, InboxOutlined, PlayCircleOutlined } from '@ant-design/icons';
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

        // Extract 12 frames for a nice grid (4x3)
        // Avoid very start (0) and very end
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
            // Auto-select the first 3 by default
            setSelectedFrameIndices([0, 1, 2]);
            message.success({ content: '장면 추출 완료! 변환할 장면을 선택해주세요.', key: 'analyze' });
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

    const handleUpload = async () => {
        const file = fileList[0];
        if (!file) {
            message.warning('먼저 영상 파일을 선택해 주세요!');
            return;
        }

        setUploading(true);
        setProgress(0);
        setAiImages([]);
        setConverting(true);

        try {
            // 1. Get Presigned URL
            message.loading({ content: '업로드 링크 생성 중...', key: 'upload' });
            const { data: presignedData } = await axios.post('/api/upload-url', {
                filename: file.name,
                fileType: file.type
            });

            if (!presignedData.success) {
                if (presignedData.error && presignedData.error.includes('DB')) {
                    throw new Error('D1 데이터베이스 설정이 확인되지 않습니다.');
                }
                throw new Error(presignedData.error || 'URL 생성 실패');
            }

            const { uploadUrl, fileId } = presignedData;

            // 2. Upload directly to R2
            message.loading({ content: '영상 업로드 중...', key: 'upload' });

            await axios.put(uploadUrl, file.originFileObj || file, {
                headers: { 'Content-Type': file.type },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setProgress(percent);
                    }
                }
            });

            // 3. Notify Complete
            await axios.post('/api/upload-complete', { fileId });

            message.success({ content: '업로드 완료! AI 변환을 시작합니다.', key: 'upload' });
            setUploading(false); // Stop upload loading, start AI loading

            // 4. Trigger AI Transformation
            const newAiImages = [];
            const targets = selectedFrameIndices.map(idx => extractedFrames[idx]);

            if (targets.length === 0) {
                message.warning('변환할 장면을 하나 이상 선택해주세요!');
                setUploading(false);
                setConverting(false);
                return;
            }

            for (let i = 0; i < targets.length; i++) {
                // Add delay between requests to avoid Rate Limits (especially after fast failures)
                if (i > 0) {
                    message.loading({ content: `서버 과부하 방지 대기 중... (${i}/${targets.length})`, key: 'ai', duration: 0 });
                    await new Promise(r => setTimeout(r, 5000)); // 5s cooldown
                }

                message.loading({ content: `${i + 1}/${targets.length} 장면 변환 중...`, key: 'ai' });
                const frameDataUrl = targets[i];

                // Convert DataURL to Blob
                const res = await fetch(frameDataUrl);
                const blob = await res.blob();

                const runConversion = async (retryCount = 0): Promise<boolean> => {
                    const formData = new FormData();
                    formData.append('image', blob);
                    formData.append('prompt', 'korean webtoon style, vibrant colors, clean lines, high quality, 2d anime');

                    try {
                        const aiRes = await axios.post('/api/ai-transform', formData);
                        if (aiRes.data.success) {
                            newAiImages.push(aiRes.data.image);
                            return true;
                        }
                    } catch (aiErr: any) {
                        const status = aiErr.response?.status;
                        const data = aiErr.response?.data;
                        let errorMsg = data?.error || aiErr.message || '알 수 없는 오류';

                        // Handle 429 (Rate Limit) -> Retry
                        if ((status === 429 || errorMsg.includes('rate limit')) && retryCount < 2) {
                            message.warning({ content: `사용량 초과 대기 중 (15초 후 재시도)...`, key: `ai_retry_${i}`, duration: 15 });
                            console.log(`Rate limit hit for scene ${i + 1}. Retrying in 15s...`);
                            await new Promise(r => setTimeout(r, 15000));
                            return runConversion(retryCount + 1);
                        }

                        // Handle Other Errors
                        console.error('AI Transform Error Full:', aiErr);

                        if (typeof data === 'string' && data.includes('Time-out')) {
                            errorMsg = '서버 응답 시간 초과 (Cloudflare Timeout)';
                        }

                        const fullMsg = `장면 ${i + 1} 실패: ${errorMsg}`;
                        // message.error works but we let the loop continue
                        message.error({ content: fullMsg, key: `ai_err_${i}`, duration: 5 });
                    }
                    return false;
                };

                await runConversion();
            }

            setAiImages(newAiImages);
            if (newAiImages.length > 0) {
                message.success({ content: 'AI 변환 완료!', key: 'ai' });
            } else {
                message.warning({ content: 'AI 변환에 실패했습니다. 설정(AI Binding)을 확인해주세요.', key: 'ai' });
            }

        } catch (error: any) {
            console.error(error);
            const errMsg = error.response?.data?.error || error.message || '업로드 실패';
            message.error({ content: `오류 발생: ${errMsg}`, key: 'upload', duration: 5 });
        } finally {
            setUploading(false);
            setConverting(false);
        }
    };

    const uploadProps: UploadProps = {
        onRemove: () => {
            setFileList([]);
            setExtractedFrames([]);
            setAiImages([]);
        },
        beforeUpload: (file) => {
            const isVideo = file.type.startsWith('video/');
            if (!isVideo) {
                message.error(`${file.name}은(는) 동영상 파일이 아닙니다.`);
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
                token: {
                    colorPrimary: '#CCFF00',
                    colorBgContainer: '#141414',
                    colorText: '#ffffff',
                },
                components: {
                    Button: {
                        colorPrimary: '#CCFF00',
                        algorithm: true,
                        colorTextLightSolid: '#000000',
                    }
                }
            }}
        >
            <main className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
                {/* Hidden Elements for Analysis */}
                <video
                    ref={videoRef}
                    style={{ display: 'none' }}
                    onLoadedData={handleVideoLoaded}
                    crossOrigin="anonymous"
                    muted
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <div className="w-full max-w-4xl text-center space-y-8">

                    <div className="space-y-4 animate-fade-in">
                        <ThunderboltOutlined style={{ fontSize: '48px', color: '#CCFF00' }} />
                        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#CCFF00] to-green-400">
                            WEBTOON AI CONVERTER
                        </h1>
                        <p className="text-gray-400 text-lg">
                            영상을 분석하여 웹툰으로 변환합니다.
                        </p>
                    </div>

                    <Row gutter={[24, 24]}>
                        {/* Left: Upload Area */}
                        <Col xs={24} md={extractedFrames.length > 0 ? 12 : 24}>
                            <Card
                                bordered={false}
                                className="w-full shadow-2xl shadow-[#CCFF00]/10"
                                style={{ background: '#1c1c1c', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                            >
                                {fileList.length === 0 ? (
                                    <Dragger {...uploadProps} style={{ padding: '40px', background: 'transparent', border: 'none' }}>
                                        <p className="ant-upload-drag-icon">
                                            <InboxOutlined style={{ color: '#CCFF00', fontSize: '48px' }} />
                                        </p>
                                        <p className="text-xl font-bold text-white mt-4">
                                            영상 업로드
                                        </p>
                                        <p className="text-gray-500 mt-2">
                                            여기를 클릭하거나 파일을 드래그하세요
                                        </p>
                                    </Dragger>
                                ) : (
                                    <div className="p-8">
                                        <PlayCircleOutlined style={{ fontSize: '64px', color: '#CCFF00' }} />
                                        <p className="text-xl font-bold text-white mt-4 break-all">
                                            {fileList[0].name}
                                        </p>
                                        <Button danger onClick={() => { setFileList([]); setExtractedFrames([]); setAiImages([]); }} style={{ marginTop: '20px' }}>
                                            다른 영상 선택
                                        </Button>
                                    </div>
                                )}

                                {uploading && (
                                    <div className="mt-6 px-8">
                                        <Progress
                                            percent={progress}
                                            strokeColor={{ '0%': '#CCFF00', '100%': '#87d068' }}
                                            trailColor="#333"
                                        />
                                        <p className="text-gray-400 mt-2 text-sm">업로드 중...</p>
                                    </div>
                                )}
                            </Card>
                        </Col>

                        {/* Right: Analysis Result (Selection Mode) */}
                        {extractedFrames.length > 0 && (
                            <Col xs={24} md={12}>
                                <Card
                                    title={
                                        <div className="flex justify-between items-center">
                                            <span style={{ color: '#CCFF00' }}>✨ 주요 장면 선택 ({selectedFrameIndices.length})</span>
                                            <span className="text-gray-400 text-sm font-normal">변환할 장면을 클릭하세요</span>
                                        </div>
                                    }
                                    bordered={false}
                                    style={{ background: '#1c1c1c', height: '100%' }}
                                >
                                    <div className="grid grid-cols-3 gap-2 mb-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {extractedFrames.map((frame, idx) => {
                                            const isSelected = selectedFrameIndices.includes(idx);
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`relative rounded-lg overflow-hidden cursor-pointer transition-all ${isSelected ? 'ring-2 ring-[#CCFF00] scale-95 opacity-100' : 'opacity-60 hover:opacity-100'}`}
                                                    onClick={() => toggleFrameSelection(idx)}
                                                >
                                                    <Image src={frame} alt={`Scene ${idx}`} preview={false} />
                                                    {isSelected && (
                                                        <div className="absolute top-1 right-1 bg-[#CCFF00] text-black w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs">
                                                            ✓
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <Button
                                        type="primary"
                                        block
                                        size="large"
                                        icon={<ThunderboltOutlined />}
                                        loading={uploading || converting}
                                        onClick={handleUpload}
                                        disabled={selectedFrameIndices.length === 0}
                                        style={{ height: '56px', fontSize: '18px', fontWeight: 'bold' }}
                                    >
                                        {converting ? 'AI 변환 중...' : `${selectedFrameIndices.length}개 장면 변환하기`}
                                    </Button>
                                </Card>
                            </Col>
                        )}

                        {/* AI Results */}
                        {aiImages.length > 0 && (
                            <Col span={24}>
                                <Card
                                    title={<span style={{ color: '#CCFF00' }}>🚀 웹툰 변환 완료</span>}
                                    bordered={false}
                                    style={{ background: '#1c1c1c' }}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {aiImages.map((img, idx) => (
                                            <Card
                                                key={idx}
                                                hoverable
                                                cover={<Image src={img} alt={`Webtoon ${idx}`} />}
                                                style={{ border: '1px solid #333', background: '#000' }}
                                            >
                                                <Card.Meta
                                                    title={<span style={{ color: '#fff' }}>Scene #{idx + 1}</span>}
                                                    description={<span style={{ color: '#666' }}>Webtoon Style</span>}
                                                />
                                            </Card>
                                        ))}
                                    </div>
                                    <Button
                                        block
                                        style={{ marginTop: '20px', background: '#333', color: '#fff', border: 'none' }}
                                        onClick={() => {
                                            setFileList([]);
                                            setExtractedFrames([]);
                                            setAiImages([]);
                                            setProgress(0);
                                        }}
                                    >
                                        처음으로 돌아가기
                                    </Button>
                                </Card>
                            </Col>
                        )}
                    </Row>

                </div>
            </main>
        </ConfigProvider>
    );
}