'use client';
import { useState } from 'react';
import { Image, Modal, Button } from 'antd';
import { DownloadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';

interface GalleryImage {
    id: string;
    url: string;
    prompt: string;
    created_at: number;
}

interface Props {
    images: GalleryImage[];
}

export default function MasonryGallery({ images }: Props) {
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    return (
        <>
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                {images.map((img) => (
                    <div
                        key={img.id}
                        className="break-inside-avoid relative group rounded-xl overflow-hidden cursor-pointer"
                        onClick={() => setPreviewImage(img.url)}
                    >
                        <img
                            src={img.url}
                            alt={img.prompt}
                            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                        />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
                            <div className="flex justify-end">
                                <Button
                                    shape="circle"
                                    icon={<DownloadOutlined />}
                                    ghost
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(img.url, '_blank');
                                    }}
                                />
                            </div>
                            <div>
                                <p className="text-white/90 text-sm line-clamp-2 font-light">
                                    {img.prompt}
                                </p>
                                <p className="text-[#CCFF00] text-xs mt-1 font-mono">
                                    {new Date(img.created_at * 1000).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Lightbox Modal */}
            <Modal
                open={!!previewImage}
                footer={null}
                onCancel={() => setPreviewImage(null)}
                centered
                width={800}
                className="gallery-modal"
                styles={{ content: { background: 'transparent', boxShadow: 'none' } }}
                closeIcon={<span className="text-white text-xl">×</span>}
            >
                {previewImage && (
                    <img
                        src={previewImage}
                        alt="Preview"
                        className="w-full h-auto rounded-lg shadow-2xl"
                    />
                )}
            </Modal>
        </>
    );
}
