'use client';

export const runtime = 'edge';
import { useEffect, useState } from 'react';
import { ConfigProvider, theme, Card, Spin, Row, Col, Image, Typography, Button } from 'antd';
import { ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

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
                        <Row gutter={[24, 24]}>
                            {images.map((img, idx) => (
                                <Col xs={24} sm={12} md={8} lg={6} key={img.id || idx}>
                                    <div className="group relative overflow-hidden rounded-xl border border-gray-800 bg-[#1c1c1c] transition-all hover:border-[#CCFF00] hover:shadow-[0_0_20px_rgba(204,255,0,0.2)]">
                                        <Image
                                            src={img.url}
                                            alt={img.prompt}
                                            style={{ width: '100%', height: '300px', objectFit: 'cover' }}
                                            className="transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                            <p className="text-gray-300 text-xs line-clamp-2">
                                                {img.prompt}
                                            </p>
                                            <p className="text-[#CCFF00] text-xs mt-1">
                                                {new Date(img.created_at * 1000).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </Col>
                            ))}

                            {!loading && images.length === 0 && (
                                <Col span={24}>
                                    <div className="text-center py-20 text-gray-500">
                                        <p className="text-xl">아직 변환된 이미지가 없습니다.</p>
                                        <p>영상을 업로드하여 첫 번째 작품을 만들어보세요!</p>
                                    </div>
                                </Col>
                            )}
                        </Row>
                    )}
                </div>
            </main>
        </ConfigProvider>
    );
}
