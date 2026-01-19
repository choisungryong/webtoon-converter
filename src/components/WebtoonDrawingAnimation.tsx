'use client';

import { useEffect, useState } from 'react';

interface WebtoonDrawingAnimationProps {
    progress: number; // 0-100
    currentImage: number;
    totalImages: number;
}

export default function WebtoonDrawingAnimation({
    progress,
    currentImage,
    totalImages
}: WebtoonDrawingAnimationProps) {
    const [drawPhase, setDrawPhase] = useState(0);

    // Cycle through drawing phases
    useEffect(() => {
        const interval = setInterval(() => {
            setDrawPhase(prev => (prev + 1) % 5);
        }, 600);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="webtoon-drawing-animation">
            {/* Main Panel */}
            <div className="drawing-panel">
                {/* Sketch Layer */}
                <svg
                    viewBox="0 0 200 280"
                    className="drawing-svg"
                    style={{ opacity: drawPhase >= 0 ? 1 : 0 }}
                >
                    {/* Panel Border */}
                    <rect
                        x="5" y="5"
                        width="190" height="270"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="panel-border"
                        style={{
                            strokeDasharray: 940,
                            strokeDashoffset: drawPhase >= 0 ? 0 : 940,
                        }}
                    />

                    {/* Character Sketch - Head */}
                    <circle
                        cx="100" cy="80" r="35"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="sketch-line"
                        style={{
                            strokeDasharray: 220,
                            strokeDashoffset: drawPhase >= 1 ? 0 : 220,
                        }}
                    />

                    {/* Hair */}
                    <path
                        d="M65 70 Q80 30 100 25 Q120 30 135 70"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="sketch-line"
                        style={{
                            strokeDasharray: 120,
                            strokeDashoffset: drawPhase >= 1 ? 0 : 120,
                        }}
                    />

                    {/* Eyes */}
                    <ellipse cx="85" cy="75" rx="8" ry="10"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        className="sketch-line"
                        style={{
                            strokeDasharray: 60,
                            strokeDashoffset: drawPhase >= 2 ? 0 : 60,
                        }}
                    />
                    <ellipse cx="115" cy="75" rx="8" ry="10"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        className="sketch-line"
                        style={{
                            strokeDasharray: 60,
                            strokeDashoffset: drawPhase >= 2 ? 0 : 60,
                        }}
                    />

                    {/* Pupils */}
                    <circle cx="85" cy="77" r="3"
                        fill="currentColor"
                        style={{ opacity: drawPhase >= 2 ? 1 : 0 }}
                    />
                    <circle cx="115" cy="77" r="3"
                        fill="currentColor"
                        style={{ opacity: drawPhase >= 2 ? 1 : 0 }}
                    />

                    {/* Mouth */}
                    <path
                        d="M90 100 Q100 110 110 100"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="sketch-line"
                        style={{
                            strokeDasharray: 30,
                            strokeDashoffset: drawPhase >= 2 ? 0 : 30,
                        }}
                    />

                    {/* Body */}
                    <path
                        d="M100 115 L100 180 M100 140 L70 170 M100 140 L130 170 M100 180 L75 240 M100 180 L125 240"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="sketch-line"
                        style={{
                            strokeDasharray: 250,
                            strokeDashoffset: drawPhase >= 3 ? 0 : 250,
                        }}
                    />

                    {/* Background Details */}
                    <g style={{ opacity: drawPhase >= 4 ? 1 : 0 }}>
                        <line x1="20" y1="250" x2="180" y2="250" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                        <circle cx="30" cy="30" r="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                        <circle cx="170" cy="40" r="5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                    </g>
                </svg>

                {/* Ink Splash Effect */}
                <div className={`ink-splash ${drawPhase === 1 ? 'active' : ''}`} />
                <div className={`ink-splash delay ${drawPhase === 3 ? 'active' : ''}`} />
            </div>

            {/* Status Text */}
            <div className="drawing-status">
                <p className="status-title">
                    ✨ 웹툰 스타일로 변환 중...
                </p>
                <p className="status-detail">
                    {currentImage}/{totalImages}장 처리 중
                    <span className="dots">
                        <span>.</span><span>.</span><span>.</span>
                    </span>
                </p>
                <div className="mini-progress">
                    <div
                        className="mini-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <style jsx>{`
                .webtoon-drawing-animation {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 24px;
                    gap: 20px;
                }
                
                .drawing-panel {
                    position: relative;
                    width: 160px;
                    height: 224px;
                    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }
                
                .drawing-svg {
                    width: 100%;
                    height: 100%;
                    color: #CCFF00;
                }
                
                .panel-border,
                .sketch-line {
                    transition: stroke-dashoffset 0.6s ease-out;
                }
                
                .ink-splash {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(204,255,0,0.3) 0%, transparent 70%);
                    pointer-events: none;
                    opacity: 0;
                    transform: scale(0);
                    top: 50%;
                    left: 50%;
                    margin: -20px 0 0 -20px;
                }
                
                .ink-splash.active {
                    animation: splash 0.6s ease-out forwards;
                }
                
                .ink-splash.delay {
                    top: 70%;
                    left: 40%;
                }
                
                @keyframes splash {
                    0% {
                        opacity: 1;
                        transform: scale(0);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(3);
                    }
                }
                
                .drawing-status {
                    text-align: center;
                }
                
                .status-title {
                    color: #CCFF00;
                    font-size: 16px;
                    font-weight: 600;
                    margin: 0 0 4px 0;
                }
                
                .status-detail {
                    color: #888;
                    font-size: 13px;
                    margin: 0 0 12px 0;
                }
                
                .dots span {
                    animation: blink 1.4s infinite;
                    animation-fill-mode: both;
                }
                
                .dots span:nth-child(2) {
                    animation-delay: 0.2s;
                }
                
                .dots span:nth-child(3) {
                    animation-delay: 0.4s;
                }
                
                @keyframes blink {
                    0%, 80%, 100% { opacity: 0; }
                    40% { opacity: 1; }
                }
                
                .mini-progress {
                    width: 120px;
                    height: 4px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 2px;
                    margin: 0 auto;
                    overflow: hidden;
                }
                
                .mini-progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #CCFF00, #00C853);
                    border-radius: 2px;
                    transition: width 0.3s ease;
                }
            `}</style>
        </div>
    );
}
