'use client';

export const runtime = 'edge';
import { useState } from 'react';
import { Button, Upload, message, Card, ConfigProvider, theme } from 'antd';
import { UploadOutlined, ThunderboltOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Dragger } = Upload;

export default function Home() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleConvert = async () => {
        if (!videoFile) {
            message.warning('먼저 영상 파일을 선택해 주세요!');
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append('video', videoFile);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok && result.success) {
                message.success('영상 업로드 성공! 웹툰 변환을 시작합니다.');
                console.log('저장된 파일명:', result.fileName);
                // TODO: AI 변환 로직 연결
            } else {
                throw new Error(result.error || '업로드 실패');
            }
        } catch (error) {
            console.error('Error:', error);
            message.error('오류 발생: ' + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const uploadProps: UploadProps = {
        name: 'file',
        multiple: false,
        beforeUpload: (file) => {
            const isVideo = file.type.startsWith('video/');
            if (!isVideo) {
                message.error(`${file.name}은(는) 동영상 파일이 아닙니다.`);
            }
            return isVideo || Upload.LIST_IGNORE;
        },
        onChange(info) {
            const { status } = info.file;
            if (status === 'done') {
                message.success(`${info.file.name} 파일 업로드 준비 완료.`);
                setVideoFile(info.file.originFileObj as File);
            } else if (status === 'error') {
                message.error(`${info.file.name} 파일 업로드 실패.`);
            }
        },
        onDrop(e) {
            console.log('Dropped files', e.dataTransfer.files);
        },
        customRequest: ({ onSuccess }) => {
            setTimeout(() => {
                onSuccess?.("ok");
            }, 0);
        }
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
                        colorTextLightSolid: '#000000', // 검은색 텍스트로 가독성 확보
                    }
                }
            }}
        >
            <main className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-2xl text-center space-y-8">

                    {/* Header Section */}
                    <div className="space-y-4 animate-fade-in">
                        <ThunderboltOutlined style={{ fontSize: '48px', color: '#CCFF00' }} />
                        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#CCFF00] to-green-400">
                            영상을 웹툰으로 바꾸기
                        </h1>
                        <p className="text-gray-400 text-lg">
                            당신의 일상을 K-웹툰 주인공처럼 만들어보세요.
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
                                MP4, MOV 등 동영상 파일 지원
                            </p>
                        </Dragger>

                        <Button
                            type="primary"
                            block
                            size="large"
                            icon={<ThunderboltOutlined />}
                            loading={isLoading}
                            onClick={handleConvert}
                            style={{
                                marginTop: '24px',
                                height: '56px',
                                fontSize: '18px',
                                fontWeight: 'bold'
                            }}
                        >
                            {isLoading ? '변환 중입니다...' : '웹툰으로 변환하기'}
                        </Button>
                    </Card>

                </div>
            </main>
        </ConfigProvider>
    );
}