'use client';

import React from 'react';
import { STYLE_OPTIONS, StyleOption } from '../data/styles';
import { CheckCircleFilled } from '@ant-design/icons';

interface StyleSelectorProps {
    selectedStyleId: string;
    onStyleSelect: (style: StyleOption) => void;
}

export default function StyleSelector({ selectedStyleId, onStyleSelect }: StyleSelectorProps) {
    return (
        <div style={{ overflow: 'hidden' }}>
            <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '12px'
            }}>
                스타일 선택
            </h3>

            {/* Grid instead of horizontal scroll for better containment */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '8px'
            }}>
                {STYLE_OPTIONS.map((style) => {
                    const isSelected = style.id === selectedStyleId;
                    return (
                        <div
                            key={style.id}
                            onClick={() => onStyleSelect(style)}
                            style={{
                                cursor: 'pointer',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                border: isSelected ? '2px solid var(--accent-color)' : '2px solid transparent',
                                background: 'var(--bg-secondary)',
                                boxShadow: isSelected ? '0 0 12px var(--accent-glow)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {/* Thumbnail */}
                            <div style={{
                                width: '100%',
                                aspectRatio: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: getStyleGradient(style.id)
                            }}>
                                {isSelected && (
                                    <CheckCircleFilled style={{
                                        fontSize: '20px',
                                        color: 'var(--accent-color)',
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                                    }} />
                                )}
                            </div>
                            {/* Name */}
                            <div style={{
                                padding: '6px 4px',
                                textAlign: 'center',
                                fontSize: '10px',
                                fontWeight: 500,
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {style.name.split(' ')[0]}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Description */}
            <p style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                textAlign: 'center',
                marginTop: '12px'
            }}>
                {STYLE_OPTIONS.find(s => s.id === selectedStyleId)?.description}
            </p>
        </div>
    );
}

function getStyleGradient(styleId: string): string {
    const gradients: Record<string, string> = {
        'watercolor': 'linear-gradient(135deg, #87CEEB 0%, #98D8AA 50%, #F5DEB3 100%)',
        '3d-cartoon': 'linear-gradient(135deg, #FFB6C1 0%, #87CEEB 50%, #DDA0DD 100%)',
        'dark-fantasy': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        'elegant-fantasy': 'linear-gradient(135deg, #2d1b4e 0%, #1a1a2e 50%, #4a1942 100%)',
        'classic-webtoon': 'linear-gradient(135deg, #2c3e50 0%, #3498db 50%, #1abc9c 100%)',
    };
    return gradients[styleId] || 'linear-gradient(135deg, #333 0%, #666 100%)';
}
