'use client';

export const runtime = 'edge';
import { useState } from 'react';
import { Button, Upload, message, Card, ConfigProvider, theme, Progress } from 'antd';
import { ThunderboltOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import axios from 'axios';

const { Dragger } = Upload;

export default function Home() {
    const [fileList, setFileList] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleUpload = async () => {
        const file = fileList[0];
        if (!file) {
            message.warning('먼저 영상 파일을 선택해 주세요!');
            return;
        }

        setUploading(true);
        setProgress(0);

        try {
            // 1. Get Presigned URL
            message.loading({ content: '업로드 링크 생성 중...', key: 'upload' });
            const { data: presignedData } = await axios.post('/api/upload-url', {
                filename: file.name,
                fileType: file.type
            });

            if (!presignedData.success) {
                // Check if it's the specific DB error to check for config
                if (presignedData.error && presignedData.error.includes('DB')) {
                    throw new Error('D1 데이터베이스 설정이 확인되지 않습니다. Cloudflare 대시보드를 확인해주세요.');
                }
                throw new Error(presignedData.error || 'URL 생성 실패');
            }

            const { uploadUrl, fileId } = presignedData;

            // 2. Upload directly to R2
            message.loading({ content: '영상 업로드 중...', key: 'upload' });

            await axios.put(uploadUrl, file, {
                headers: {
                    'Content-Type': file.type
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setProgress(percent);
                    }
                }
            });

            // 3. Notify Complete
            await axios.post('/api/upload-complete', { fileId });

            message.success({ content: '업로드 완료! 변환 대기 중...', key: 'upload' });
            setFileList([]);
            setProgress(100);

        } catch (error: any) {
            console.error(error);
            const errMsg = error.response?.data?.error || error.message || '업로드 실패';
            message.error({ content: `오류 발생: ${errMsg}`, key: 'upload', duration: 5 });
        } finally {
            setUploading(false);
        }
    };

    const uploadProps: UploadProps = {
        onRemove: (file) => {
            setFileList([]);
        },
        beforeUpload: (file) => {
            const isVideo = file.type.startsWith('video/');
            if (!isVideo) {
                message.error(`${file.name}은(는) 동영상 파일이 아닙니다.`);
                return Upload.LIST_IGNORE;
            }
            // Manually handle file list to allow single file replacement
            setFileList([file]);
            return false; // Prevent automatic upload
        },
        fileList,
        maxCount: 1
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                    colorPrimary: '#CCFF00', // Neon Yellow
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
                <div className="w-full max-w-2xl text-center space-y-8">

                    {/* Header */}
                    <div className="space-y-4 animate-fade-in">
                        <ThunderboltOutlined style={{ fontSize: '48px', color: '#CCFF00' }} />
                        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#CCFF00] to-green-400">
                            영상을 웹툰으로 바꾸기
                        </h1>
                        <p className="text-gray-400 text-lg">
                            D1 & R2 기반의 초고속 업로드
                        </p>
                    </div>

                    {/* Upload Card */}
                    <Card
                        bordered={false}
                        className="w-full shadow-2xl shadow-[#CCFF00]/10"
                        style={{ background: '#1c1c1c' }}
                    >
                        <Dragger {...uploadProps} style={{ padding: '40px', background: '#141414', borderColor: '#333' }}>
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined style={{ color: '#CCFF00' }} />
                            </p>
                            <p className="ant-upload-text" style={{ color: '#fff' }}>
                                클릭하거나 영상을 여기로 드래그하세요
                            </p>
                            <p className="ant-upload-hint" style={{ color: '#666' }}>
                                대용량 영상도 실시간으로 안전하게 업로드됩니다.
                            </p>
                        </Dragger>

                        {uploading && (
                            <div className="mt-6 px-4">
                                <Progress
                                    percent={progress}
                                    strokeColor={{ '0%': '#CCFF00', '100%': '#87d068' }}
                                    trailColor="#333"
                                    status="active"
                                />
                                <p className="text-gray-400 mt-2 text-sm text-center">R2 스토리지로 전송 중... ({progress}%)</p>
                            </div>
                        )}

                        <Button
                            type="primary"
                            block
                            size="large"
                            icon={<ThunderboltOutlined />}
                            loading={uploading}
                            onClick={handleUpload}
                            disabled={fileList.length === 0}
                            style={{
                                marginTop: '24px',
                                height: '56px',
                                fontSize: '18px',
                                fontWeight: 'bold'
                            }}
                        >
                            {uploading ? '변환 중입니다...' : '웹툰으로 변환하기'}
                        </Button>
                    </Card>

                </div>
            </main>
        </ConfigProvider>
    );
}