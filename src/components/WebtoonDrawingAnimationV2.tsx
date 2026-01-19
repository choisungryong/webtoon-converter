'use client';

import { useEffect, useState } from 'react';

interface WebtoonDrawingAnimationProps {
    progress: number;
    currentImage: number;
    totalImages: number;
}

export default function WebtoonDrawingAnimationV2({
    progress,
    currentImage,
    totalImages
}: WebtoonDrawingAnimationProps) {
    return (
        <div className="loading-container">
            {/* Shimmering Text Effect */}
            <h2 className="loading-text">
                🎨 열심히 스케치하는 중...
            </h2>

            <p className="sub-text">
                ({currentImage + 1}/{totalImages}장 처리됨)
            </p>

            {/* Stylish Progress Bar */}
            <div className="progress-container">
                <div
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <style jsx>{`
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    width: 100%;
                }

                .loading-text {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 8px;
                    background: linear-gradient(
                        90deg,
                        #ffffff 0%,
                        #ffffff 40%,
                        #FFC107 50%,
                        #ffffff 60%,
                        #ffffff 100%
                    );
                    background-size: 200% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    background-clip: text;
                    animation: shimmer 2s linear infinite;
                }

                .sub-text {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 14px;
                    margin-bottom: 24px;
                }

                .progress-container {
                    width: 100%;
                    max-width: 300px;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    overflow: hidden;
                    position: relative;
                }

                .progress-bar {
                    height: 100%;
                    background: var(--accent-color);
                    border-radius: 3px;
                    transition: width 0.3s ease;
                    box-shadow: 0 0 10px var(--accent-color);
                }

                @keyframes shimmer {
                    to {
                        background-position: 200% center;
                    }
                }
            `}</style>
        </div>
    );
}
