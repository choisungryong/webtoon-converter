'use client';

import React from 'react';
import { Image } from 'antd';
import type { PanelLayout } from '../types/layout';

interface WebtoonViewerProps {
    images: string[];
    layouts: PanelLayout[];
    onImageClick?: (index: number) => void;
}

// Gutter size mapping (in pixels)
const gutterMap: Record<string, number> = {
    'none': 0,
    'small': 8,
    'medium': 20,
    'large': 40
};

// Panel width percentages for different types
const panelWidthMap: Record<string, string> = {
    'full-width': '100%',
    'half': '48%',
    'third': '31%',
    'inset-over-prev': '40%'
};

export default function WebtoonViewer({
    images,
    layouts,
    onImageClick
}: WebtoonViewerProps) {

    // Ensure we have layouts for all images
    const getLayout = (index: number): PanelLayout => {
        return layouts[index] || {
            index,
            type: 'half',
            gutter: 'medium',
            importance: 0.5,
            indent: 'center'
        };
    };

    const renderPanel = (image: string, index: number) => {
        const layout = getLayout(index);
        const isInset = layout.type === 'inset-over-prev';
        const prevLayout = index > 0 ? getLayout(index - 1) : null;

        // Calculate styles based on layout
        const panelStyle: React.CSSProperties = {
            width: panelWidthMap[layout.type],
            marginTop: isInset ? `-${gutterMap.large}px` : `${gutterMap[layout.gutter]}px`,
            marginLeft: layout.indent === 'left' ? '0' : 'auto',
            marginRight: layout.indent === 'right' ? '0' : 'auto',
            position: isInset ? 'relative' : 'static',
            zIndex: isInset ? 10 : 1,
            transform: isInset ? 'translateY(-30%)' : 'none',
            boxShadow: isInset
                ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 3px rgba(255,255,255,0.1)'
                : '0 4px 16px rgba(0,0,0,0.3)',
            borderRadius: '8px',
            overflow: 'hidden',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
        };

        // Importance-based border glow
        if (layout.importance > 0.7) {
            panelStyle.boxShadow = `0 0 30px rgba(204, 255, 0, 0.3), ${panelStyle.boxShadow}`;
        }

        return (
            <div
                key={index}
                className={`webtoon-panel panel-${layout.type}`}
                style={panelStyle}
                onClick={() => onImageClick?.(index)}
            >
                <Image
                    src={image}
                    alt={`Panel ${index + 1}`}
                    style={{
                        width: '100%',
                        display: 'block',
                        cursor: onImageClick ? 'pointer' : 'default'
                    }}
                    preview={{ mask: '크게 보기' }}
                />

                {/* Frame break effect for high importance */}
                {layout.importance > 0.8 && (
                    <div className="frame-break-effect" />
                )}
            </div>
        );
    };

    return (
        <div className="webtoon-viewer">
            <div className="panels-container">
                {images.map((img, idx) => renderPanel(img, idx))}
            </div>

            <style jsx>{`
                .webtoon-viewer {
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 16px;
                    background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%);
                    border-radius: 12px;
                }

                .panels-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0; /* Gutters handled per-panel */
                }

                .webtoon-panel {
                    position: relative;
                }

                .webtoon-panel:hover {
                    transform: scale(1.01);
                    z-index: 5;
                }

                .panel-inset-over-prev {
                    align-self: flex-end;
                    margin-right: 10%;
                }

                .frame-break-effect {
                    position: absolute;
                    inset: -4px;
                    border: 3px solid var(--accent-color);
                    border-radius: 12px;
                    pointer-events: none;
                    animation: pulse-border 2s infinite;
                }

                @keyframes pulse-border {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.02); }
                }

                /* Variable gutter backgrounds */
                .webtoon-panel[data-gutter="large"]::before {
                    content: '';
                    position: absolute;
                    top: -40px;
                    left: -20%;
                    right: -20%;
                    height: 40px;
                    background: linear-gradient(
                        180deg, 
                        transparent 0%, 
                        rgba(0,0,0,0.3) 50%,
                        transparent 100%
                    );
                    pointer-events: none;
                }

                @media (max-width: 480px) {
                    .webtoon-viewer {
                        padding: 8px;
                    }
                    
                    .webtoon-panel {
                        width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
}
