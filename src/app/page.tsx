'use client';

export const runtime = 'edge';
import { useState } from 'react';
import { Button, Upload, message, Card } from 'antd';
import { UploadOutlined, MagicWandOutlined } from '@ant-design/icons'; // 아이콘은 프로젝트에 맞게 조절

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
        formData.append('video', videoFile); // API에서 받을 key 이름

        try {
            // 1. 우리가 만든 R2 업로드 API 호출
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok && result.success) {
                message.success('R2 저장소에 영상 업로드 성공!');
                console.log('저장된 파일명:', result.fileName);

                // 2. TODO: 여기서 이제 AI 변환 워커를 호출하게 됩니다.
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

    return (
        <main style={{ padding: '50px', display: 'flex', justifyContent: 'center' }}>
            <Card title="ToonSnap - 영상 웹툰 변환" style={{ width: 500 }}>
                {/* 업로드 컴포넌트 생략 (기존 코드 유지) */}
                <Button
                    type="primary"
                    block
                    size="large"
                    loading={isLoading}
                    onClick={handleConvert}
                    style={{ marginTop: '20px' }}
                >
                    웹툰으로 변환하기
                </Button>
            </Card>
        </main>
    );
}