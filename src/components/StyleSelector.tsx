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
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">스타일 선택</h3>
            <div className="horizontal-scroll">
                {STYLE_OPTIONS.map((style) => {
                    const isSelected = style.id === selectedStyleId;
                    return (
                        <div
                            key={style.id}
                            className={`style-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => onStyleSelect(style)}
                        >
                            {/* Placeholder gradient for thumbnail */}
                            <div
                                className="w-full aspect-square flex items-center justify-center"
                                style={{
                                    background: getStyleGradient(style.id)
                                }}
                            >
                                {isSelected && (
                                    <CheckCircleFilled
                                        style={{
                                            fontSize: '32px',
                                            color: '#CCFF00',
                                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                                        }}
                                    />
                                )}
                            </div>
                            <div className="style-name">
                                {style.name}
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-xs text-gray-500 text-center">
                {STYLE_OPTIONS.find(s => s.id === selectedStyleId)?.description}
            </p>
        </div>
    );
}

// 스타일별 대표 그라디언트 색상
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
