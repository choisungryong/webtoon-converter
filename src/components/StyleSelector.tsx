'use client';

import React, { useState } from 'react';
import { STYLE_OPTIONS, StyleOption } from '../data/styles';
import { CheckCircleFilled, FireFilled } from '@ant-design/icons';

interface StyleSelectorProps {
    selectedStyleId: string;
    onStyleSelect: (style: StyleOption) => void;
}

export default function StyleSelector({ selectedStyleId, onStyleSelect }: StyleSelectorProps) {
    const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);

    // Bento Grid layout - first item is featured (larger)
    const featuredStyle = STYLE_OPTIONS[0]; // watercolor as featured (인기)
    const otherStyles = STYLE_OPTIONS.filter(s => s.id !== featuredStyle.id);

    const handleSelect = (style: StyleOption) => {
        onStyleSelect(style);
    };

    return (
        <div className="bento-style-selector">
            <div className="selector-header">
                <h3>스타일 선택</h3>
                <span className="style-count">{STYLE_OPTIONS.length}개 스타일</span>
            </div>

            {/* Bento Grid Layout */}
            <div className="bento-grid">
                {/* Featured Large Card */}
                <div
                    className={`bento-card featured ${selectedStyleId === featuredStyle.id ? 'selected' : ''}`}
                    onClick={() => handleSelect(featuredStyle)}
                    onMouseEnter={() => setHoveredStyle(featuredStyle.id)}
                    onMouseLeave={() => setHoveredStyle(null)}
                >
                    <div className="card-image">
                        <img src={featuredStyle.thumbnail} alt={featuredStyle.name} />
                        <div className="card-overlay">
                            <span className="hot-badge">
                                <FireFilled /> 인기
                            </span>
                        </div>
                        {selectedStyleId === featuredStyle.id && (
                            <div className="selected-overlay">
                                <CheckCircleFilled />
                            </div>
                        )}
                    </div>
                    <div className="card-info">
                        <h4>{featuredStyle.name}</h4>
                        <p>{featuredStyle.description}</p>
                    </div>
                </div>

                {/* Regular Cards */}
                {otherStyles.map((style) => (
                    <div
                        key={style.id}
                        className={`bento-card ${selectedStyleId === style.id ? 'selected' : ''}`}
                        onClick={() => handleSelect(style)}
                        onMouseEnter={() => setHoveredStyle(style.id)}
                        onMouseLeave={() => setHoveredStyle(null)}
                    >
                        <div className="card-image">
                            <img src={style.thumbnail} alt={style.name} />
                            {selectedStyleId === style.id && (
                                <div className="selected-overlay">
                                    <CheckCircleFilled />
                                </div>
                            )}
                        </div>
                        <div className="card-info">
                            <h4>{style.name.split(' ')[0]}</h4>
                        </div>
                    </div>
                ))}
            </div>

            {/* Selected Style Description */}
            <div className="selected-description">
                <span className="label">선택됨:</span>
                <span className="name">{STYLE_OPTIONS.find(s => s.id === selectedStyleId)?.name}</span>
            </div>

            <style jsx>{`
                .bento-style-selector {
                    width: 100%;
                }

                .selector-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .selector-header h3 {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    margin: 0;
                }

                .style-count {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .bento-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    grid-template-rows: auto auto;
                    gap: 10px;
                }

                .bento-card {
                    background: rgba(40, 40, 40, 0.6);
                    border-radius: 14px;
                    overflow: hidden;
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    position: relative;
                }

                .bento-card:hover {
                    transform: scale(1.03);
                    border-color: rgba(255, 255, 255, 0.2);
                }

                .bento-card:active {
                    transform: scale(0.97);
                }

                .bento-card.selected {
                    border-color: var(--accent-color);
                    box-shadow: 0 0 20px var(--accent-glow);
                }

                .bento-card.featured {
                    grid-column: span 2;
                    grid-row: span 2;
                }

                .card-image {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 1;
                    overflow: hidden;
                }

                .bento-card.featured .card-image {
                    aspect-ratio: auto;
                    height: 160px;
                }

                .card-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.3s ease;
                }

                .bento-card:hover .card-image img {
                    transform: scale(1.1);
                }

                .card-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    padding: 8px;
                    display: flex;
                    justify-content: flex-start;
                }

                .hot-badge {
                    background: linear-gradient(135deg, #ff6b6b, #ff8e53);
                    color: white;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 4px 10px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .selected-overlay {
                    position: absolute;
                    right: 8px;
                    bottom: 8px;
                    width: 28px;
                    height: 28px;
                    background: var(--accent-color);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: black;
                    font-size: 16px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                }

                .card-info {
                    padding: 10px;
                    text-align: center;
                }

                .bento-card.featured .card-info {
                    text-align: left;
                    padding: 12px 14px;
                }

                .card-info h4 {
                    font-size: 12px;
                    font-weight: 600;
                    color: white;
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .bento-card.featured .card-info h4 {
                    font-size: 15px;
                    margin-bottom: 4px;
                }

                .card-info p {
                    font-size: 11px;
                    color: var(--text-muted);
                    margin: 0;
                }

                .selected-description {
                    margin-top: 14px;
                    text-align: center;
                    font-size: 13px;
                }

                .selected-description .label {
                    color: var(--text-muted);
                    margin-right: 6px;
                }

                .selected-description .name {
                    color: var(--accent-color);
                    font-weight: 600;
                }

                @media (max-width: 480px) {
                    .bento-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                    
                    .bento-card.featured {
                        grid-column: span 2;
                        grid-row: span 1;
                    }
                    
                    .bento-card.featured .card-image {
                        height: 100px;
                    }
                }
            `}</style>
        </div>
    );
}
