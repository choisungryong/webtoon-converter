'use client';
import { useState } from 'react';
import NextImage from 'next/image';
import { Image, Modal, Button } from 'antd';
import { DownloadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { formatToKoreanDate } from '../utils/dateUtils';
import { downloadFile, generateTimestampedFilename } from '../utils/fileUtils';

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
      <div className="columns-1 gap-4 space-y-4 sm:columns-2 md:columns-3 lg:columns-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative cursor-pointer break-inside-avoid overflow-hidden rounded-xl"
            onClick={() => setPreviewImage(img.url)}
          >
            <NextImage
              src={img.url}
              alt={img.prompt}
              width={0}
              height={0}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading="lazy"
              className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-110"
              style={{ width: '100%', height: 'auto' }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col justify-between bg-black/40 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex justify-end">
                <Button
                  shape="circle"
                  icon={<DownloadOutlined />}
                  ghost
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFile(img.url, generateTimestampedFilename('gallery', 'png'));
                  }}
                />
              </div>

              {/* Center Zoom Icon */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <EyeOutlined className="text-3xl text-white opacity-80 drop-shadow-lg" />
              </div>

              <div>
                <p className="text-shadow line-clamp-2 text-sm font-light text-white/90">
                  {img.prompt}
                </p>
                <p className="mt-1 font-mono text-xs text-neonYellow">
                  {formatToKoreanDate(img.created_at)}
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
        closeIcon={<span className="text-xl text-white">×</span>}
      >
        {previewImage && (
          <NextImage
            src={previewImage}
            alt="Preview"
            width={800}
            height={0}
            sizes="100vw"
            className="h-auto w-full rounded-lg shadow-2xl"
            style={{ width: '100%', height: 'auto' }}
          />
        )}
      </Modal>
    </>
  );
}
