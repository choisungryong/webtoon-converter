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
                                position: 'relative',
                                background: '#333' // Loading placeholder
                            }}>
                                <img
                                    src={style.thumbnail}
                                    alt={style.name}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block'
                                    }}
                                />
                                {isSelected && (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(0,0,0,0.4)',
                                        backdropFilter: 'blur(2px)'
                                    }}>
                                        <CheckCircleFilled style={{
                                            fontSize: '24px',
                                            color: 'var(--accent-color)',
                                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                                        }} />
                                    </div>
                                )}
                            </div>
                            {/* Name */}
                            <div style={{
                                padding: '8px 4px',
                                textAlign: 'center',
                                fontSize: '11px',
                                fontWeight: 600,
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
                fontSize: '12px',
                color: 'var(--text-muted)',
                textAlign: 'center',
                marginTop: '16px',
                minHeight: '1.5em'
            }}>
                {STYLE_OPTIONS.find(s => s.id === selectedStyleId)?.description}
            </p>
        </div>
    );
}
