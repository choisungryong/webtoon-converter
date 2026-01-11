'use client';

export const runtime = 'edge';
import { useEffect, useState } from 'react';
import { ConfigProvider, theme, Card, Spin, Row, Col, Image, Typography, Button } from 'antd';
import { ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import MasonryGallery from '../../components/MasonryGallery';
import Link from 'next/link';

const { Title } = Typography;

export default function GalleryPage() {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/gallery');
            setImages(res.data.images || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                    colorPrimary: '#CCFF00',
                    colorBgContainer: '#141414',
                    colorText: '#ffffff',
                },
            }}
        >
            <main className="min-h-screen bg-black p-8">
                <div className="max-w-7xl mx-auto space-y-8">

                    <div className="flex justify-between items-center animate-fade-in">
                        <div className="flex items-center space-x-4">
                            <ThunderboltOutlined style={{ fontSize: '32px', color: '#CCFF00' }} />
                            <Title level={2} style={{ margin: 0, color: 'white' }}>
                                My Webtoon Gallery
                            </Title>
                        </div>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchImages}
                            loading={loading}
                        >
                            Refresh
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Spin size="large" tip="Loading Artworks..." />
                        </div>
                    ) : (
                        <>
                            {images.length > 0 ? (
                                <MasonryGallery images={images} />
                            ) : (
                                <div className="text-center py-20 text-gray-500">
                                    <p className="text-xl">아직 변환된 이미지가 없습니다.</p>
                                    <Link href="/">
                                        <Button type="primary" size="large" icon={<ThunderboltOutlined />} className="mt-4">
                                            작품 만들러 가기
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </ConfigProvider>
    );
}
