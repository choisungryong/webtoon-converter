'use client';

import { useEffect, useState } from 'react';
import { Spin, Modal, message } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

import Link from 'next/link';
import GlassCard from '../../components/GlassCard';

interface GalleryImage {
    id: string;
    url: string;
    r2_key: string;
    prompt?: string;
    created_at: number;
}

export default function GalleryPage() {
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/gallery');
            const data = await res.json();
            setImages(data.images || []);
        } catch (err) {
            console.error(err);
            message.error('갤러리를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    const handleDelete = async (imageId: string) => {
        Modal.confirm({
            title: '이미지 삭제',
            icon: <ExclamationCircleOutlined />,
            content: '이 이미지를 삭제하시겠습니까?',
            okText: '삭제',
            okType: 'danger',
            cancelText: '취소',
            onOk: async () => {
                setDeleting(imageId);
                try {
                    await fetch(`/api/gallery/${imageId}`, { method: 'DELETE' });
                    setImages(prev => prev.filter(img => img.id !== imageId));
                    message.success('이미지가 삭제되었습니다.');
                } catch (err) {
                    console.error(err);
                    message.error('삭제에 실패했습니다.');
                } finally {
                    setDeleting(null);
                }
            }
        });
    };

    return (
        <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center animate-fade-in">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                            ← 홈
                        </Link>
                        <h1 className="text-2xl font-bold text-white">
                            My <span className="text-[#CCFF00]">Gallery</span>
                        </h1>
                    </div>
                    <button
                        onClick={fetchImages}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                    >
                        <ReloadOutlined spin={loading} />
                        새로고침
                    </button>
                </div>

                {/* Gallery Content */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Spin size="large" />
                    </div>
                ) : images.length > 0 ? (
                    <div className="gallery-grid">
                        {images.map((img) => (
                            <div
                                key={img.id}
                                className="gallery-item group"
                                onClick={() => setPreviewImage(img.url)}
                            >
                                <img
                                    src={img.url}
                                    alt="Generated"
                                    className="gallery-thumbnail"
                                />
                                {/* Delete Button */}
                                <button
                                    className="delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(img.id);
                                    }}
                                    disabled={deleting === img.id}
                                >
                                    {deleting === img.id ? '...' : <DeleteOutlined />}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <GlassCard className="text-center py-16">
                        <p className="text-gray-400 text-lg mb-4">아직 변환된 이미지가 없습니다.</p>
                        <Link href="/">
                            <button className="accent-btn">
                                ✨ 작품 만들러 가기
                            </button>
                        </Link>
                    </GlassCard>
                )}

                {/* 원본 이미지 미리보기 모달 */}
                <Modal
                    open={!!previewImage}
                    footer={null}
                    onCancel={() => setPreviewImage(null)}
                    centered
                    width="90vw"
                    style={{ maxWidth: '800px' }}
                    styles={{
                        content: {
                            background: 'rgba(0,0,0,0.9)',
                            padding: '12px',
                            borderRadius: '16px'
                        }
                    }}
                    closeIcon={<span style={{ color: 'white', fontSize: '20px' }}>×</span>}
                >
                    {previewImage && (
                        <img
                            src={previewImage}
                            alt="Original"
                            style={{
                                width: '100%',
                                height: 'auto',
                                borderRadius: '8px',
                                maxHeight: '85vh',
                                objectFit: 'contain'
                            }}
                        />
                    )}
                </Modal>
            </div>
        </main>
    );
}
