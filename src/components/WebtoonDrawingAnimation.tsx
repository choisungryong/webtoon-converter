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
    const [pencilX, setPencilX] = useState(50);
    const [pencilY, setPencilY] = useState(80);
    const [lineProgress, setLineProgress] = useState(0);

    // Animate pencil movement
    useEffect(() => {
        const interval = setInterval(() => {
            // Move pencil in a drawing pattern
            setPencilX(prev => {
                const newX = prev + (Math.random() - 0.3) * 30;
                return Math.max(20, Math.min(180, newX));
            });
            setPencilY(prev => {
                const newY = prev + (Math.random() - 0.5) * 25;
                return Math.max(40, Math.min(220, newY));
            });
            setLineProgress(prev => (prev + 1) % 100);
        }, 150);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="hand-sketch-animation">
            {/* Canvas/Paper */}
            <div className="sketch-paper">
                {/* Sketch Lines (appear progressively) */}
                <svg viewBox="0 0 200 260" className="sketch-canvas">
                    {/* Paper texture lines */}
                    <defs>
                        <pattern id="paper-lines" patternUnits="userSpaceOnUse" width="200" height="10">
                            <line x1="0" y1="9" x2="200" y2="9" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="200" height="260" fill="url(#paper-lines)" />

                    {/* Progressive sketch strokes */}
                    <g className="sketch-strokes">
                        {/* Head outline */}
                        <path
                            d="M70 60 Q60 80 65 100 Q70 120 100 125 Q130 120 135 100 Q140 80 130 60 Q115 40 100 38 Q85 40 70 60"
                            className="sketch-line"
                            style={{
                                strokeDasharray: 300,
                                strokeDashoffset: 300 - (lineProgress * 3),
                                opacity: lineProgress > 10 ? 1 : 0
                            }}
                        />

                        {/* Hair */}
                        <path
                            d="M65 65 Q80 25 100 22 Q120 25 135 65 M75 50 Q85 35 100 33 Q115 35 125 50"
                            className="sketch-line hair"
                            style={{
                                strokeDasharray: 200,
                                strokeDashoffset: 200 - ((lineProgress - 20) * 4),
                                opacity: lineProgress > 20 ? 1 : 0
                            }}
                        />

                        {/* Eyes */}
                        <ellipse cx="85" cy="80" rx="10" ry="12" className="sketch-line eyes"
                            style={{
                                strokeDasharray: 70,
                                strokeDashoffset: 70 - ((lineProgress - 35) * 3),
                                opacity: lineProgress > 35 ? 1 : 0
                            }}
                        />
                        <ellipse cx="115" cy="80" rx="10" ry="12" className="sketch-line eyes"
                            style={{
                                strokeDasharray: 70,
                                strokeDashoffset: 70 - ((lineProgress - 40) * 3),
                                opacity: lineProgress > 40 ? 1 : 0
                            }}
                        />

                        {/* Pupils */}
                        <circle cx="87" cy="82" r="4" className="sketch-fill"
                            style={{ opacity: lineProgress > 50 ? 1 : 0 }}
                        />
                        <circle cx="117" cy="82" r="4" className="sketch-fill"
                            style={{ opacity: lineProgress > 52 ? 1 : 0 }}
                        />

                        {/* Mouth */}
                        <path
                            d="M90 105 Q100 115 110 105"
                            className="sketch-line"
                            style={{
                                strokeDasharray: 40,
                                strokeDashoffset: 40 - ((lineProgress - 55) * 3),
                                opacity: lineProgress > 55 ? 1 : 0
                            }}
                        />

                        {/* Body */}
                        <path
                            d="M100 125 L100 180 M85 145 L60 175 M115 145 L140 175 M100 180 L75 230 M100 180 L125 230"
                            className="sketch-line body"
                            style={{
                                strokeDasharray: 300,
                                strokeDashoffset: 300 - ((lineProgress - 65) * 6),
                                opacity: lineProgress > 65 ? 1 : 0
                            }}
                        />
                    </g>
                </svg>

                {/* Animated Hand with Pencil */}
                <div
                    className="drawing-hand"
                    style={{
                        transform: `translate(${pencilX - 30}px, ${pencilY - 10}px) rotate(-35deg)`
                    }}
                >
                    <svg viewBox="0 0 60 80" width="50" height="65">
                        {/* Pencil */}
                        <g className="pencil">
                            {/* Pencil body */}
                            <rect x="28" y="0" width="8" height="45" fill="#FFD93D" rx="1" />
                            {/* Pencil tip */}
                            <polygon points="28,45 36,45 32,60" fill="#8B4513" />
                            {/* Pencil lead */}
                            <polygon points="30,55 34,55 32,62" fill="#333" />
                            {/* Eraser */}
                            <rect x="28" y="-5" width="8" height="6" fill="#FF6B6B" rx="1" />
                            {/* Metal band */}
                            <rect x="27" y="0" width="10" height="4" fill="#C0C0C0" />
                        </g>

                        {/* Hand silhouette */}
                        <g className="hand" fill="#E8D4C4" stroke="#D4B8A0" strokeWidth="0.5">
                            <ellipse cx="25" cy="35" rx="18" ry="12" />
                            {/* Fingers holding pencil */}
                            <ellipse cx="35" cy="28" rx="5" ry="10" transform="rotate(15, 35, 28)" />
                            <ellipse cx="38" cy="38" rx="4" ry="9" transform="rotate(-5, 38, 38)" />
                            <ellipse cx="20" cy="42" rx="5" ry="8" transform="rotate(-20, 20, 42)" />
                        </g>
                    </svg>
                </div>

                {/* Pencil trail effect */}
                <div
                    className="pencil-trail"
                    style={{
                        left: `${pencilX}px`,
                        top: `${pencilY}px`
                    }}
                />
            </div>

            {/* Status Text */}
            <div className="drawing-status">
                <p className="status-title">
                    ✏️ 웹툰 스타일로 그리는 중...
                </p>
                <p className="status-detail">
                    {currentImage}/{totalImages}장 처리 중
                </p>
                <div className="mini-progress">
                    <div
                        className="mini-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <style jsx>{`
                .hand-sketch-animation {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 20px;
                    gap: 16px;
                }
                
                .sketch-paper {
                    position: relative;
                    width: 160px;
                    height: 208px;
                    background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 
                        0 8px 32px rgba(0,0,0,0.4),
                        inset 0 1px 0 rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                
                .sketch-canvas {
                    width: 100%;
                    height: 100%;
                }
                
                .sketch-line {
                    fill: none;
                    stroke: #CCFF00;
                    stroke-width: 2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    transition: stroke-dashoffset 0.15s ease-out;
                }
                
                .sketch-line.hair {
                    stroke-width: 1.5;
                }
                
                .sketch-line.eyes {
                    stroke-width: 1.5;
                }
                
                .sketch-line.body {
                    stroke-width: 1.5;
                }
                
                .sketch-fill {
                    fill: #CCFF00;
                    transition: opacity 0.2s ease;
                }
                
                .drawing-hand {
                    position: absolute;
                    pointer-events: none;
                    z-index: 10;
                    transition: transform 0.15s ease-out;
                    filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.4));
                }
                
                .pencil-trail {
                    position: absolute;
                    width: 6px;
                    height: 6px;
                    background: radial-gradient(circle, rgba(204,255,0,0.6) 0%, transparent 70%);
                    border-radius: 50%;
                    pointer-events: none;
                    animation: trail-fade 0.3s ease-out forwards;
                }
                
                @keyframes trail-fade {
                    0% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0; transform: scale(2); }
                }
                
                .drawing-status {
                    text-align: center;
                }
                
                .status-title {
                    color: #CCFF00;
                    font-size: 15px;
                    font-weight: 600;
                    margin: 0 0 4px 0;
                }
                
                .status-detail {
                    color: #888;
                    font-size: 12px;
                    margin: 0 0 10px 0;
                }
                
                .mini-progress {
                    width: 100px;
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
