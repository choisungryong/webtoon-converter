'use client';

import { useEffect, useState, useRef } from 'react';

interface WebtoonDrawingAnimationProps {
    progress: number;
    currentImage: number;
    totalImages: number;
}

export default function WebtoonDrawingAnimation({
    progress,
    currentImage,
    totalImages
}: WebtoonDrawingAnimationProps) {
    const [lineProgress, setLineProgress] = useState(0);
    const [pencilPos, setPencilPos] = useState({ x: 50, y: 50 });
    const requestRef = useRef<number>();

    // Animation loop for smooth pencil movement
    useEffect(() => {
        let startTime = Date.now();
        const duration = 2000; // Cycle duration

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const cycleProgress = (elapsed % duration) / duration * 100;

            setLineProgress(cycleProgress);

            // Calculate target position based on progress (roughly following the drawing path)
            let targetX = 100;
            let targetY = 100;

            if (cycleProgress < 30) {
                // Head area (top)
                targetX = 100 + Math.sin(now * 0.01) * 30;
                targetY = 60 + Math.cos(now * 0.01) * 20;
            } else if (cycleProgress < 60) {
                // Face area (middle)
                targetX = 100 + Math.sin(now * 0.015) * 20;
                targetY = 90 + Math.cos(now * 0.015) * 15;
            } else {
                // Body area (bottom)
                targetX = 100 + Math.sin(now * 0.01) * 40;
                targetY = 150 + Math.cos(now * 0.01) * 40;
            }

            // Add high frequency jitter for scribbling effect
            const jitterX = (Math.random() - 0.5) * 10;
            const jitterY = (Math.random() - 0.5) * 10;

            setPencilPos({
                x: targetX + jitterX,
                y: targetY + jitterY
            });

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return (
        <div className="hand-sketch-animation">
            <div className="sketch-paper">
                <svg viewBox="0 0 200 260" className="sketch-canvas">
                    {/* Filters for sketchy look */}
                    <defs>
                        <filter id="pencil-texture">
                            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="noise" />
                            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
                        </filter>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                        </pattern>
                    </defs>

                    {/* Background Grid */}
                    <rect width="200" height="260" fill="url(#grid)" />

                    {/* Sketch Lines */}
                    <g className="sketch-content" filter="url(#pencil-texture)">
                        {/* Head */}
                        <path
                            d="M70 60 Q60 80 65 100 Q70 120 100 125 Q130 120 135 100 Q140 80 130 60 Q115 40 100 38 Q85 40 70 60"
                            className="pencil-stroke"
                            style={{ opacity: lineProgress > 10 ? 0.8 : 0 }}
                        />

                        {/* Hair */}
                        <path
                            d="M65 65 Q80 25 100 22 Q120 25 135 65 M75 50 Q85 35 100 33 Q115 35 125 50"
                            className="pencil-stroke"
                            style={{ opacity: lineProgress > 20 ? 0.8 : 0 }}
                        />

                        {/* Eyes */}
                        <g style={{ opacity: lineProgress > 35 ? 0.8 : 0 }}>
                            <ellipse cx="85" cy="80" rx="10" ry="12" className="pencil-stroke" />
                            <ellipse cx="115" cy="80" rx="10" ry="12" className="pencil-stroke" />
                            <circle cx="87" cy="82" r="4" fill="#555" />
                            <circle cx="117" cy="82" r="4" fill="#555" />
                        </g>

                        {/* Body */}
                        <path
                            d="M100 125 L100 180 M85 145 L60 175 M115 145 L140 175 M100 180 L75 230 M100 180 L125 230"
                            className="pencil-stroke"
                            style={{ opacity: lineProgress > 60 ? 0.8 : 0 }}
                        />

                        {/* Rough Scribbles (to simulate shading) */}
                        <path
                            d="M75 65 L85 75 M115 65 L125 75 M70 100 L80 110"
                            className="pencil-scribble"
                            style={{ opacity: lineProgress > 50 ? 0.5 : 0 }}
                        />
                    </g>
                </svg>

                {/* Hand Container */}
                <div
                    className="hand-container"
                    style={{
                        transform: `translate(${pencilPos.x - 20}px, ${pencilPos.y - 10}px)`
                    }}
                >
                    <svg width="120" height="120" viewBox="0 0 100 100" className="hand-svg">
                        <g transform="rotate(-15, 50, 50)">
                            {/* Realistic Hand Holding Pencil */}
                            {/* Hand Shadow */}
                            <path d="M40,50 Q60,40 80,60 Q70,80 50,70 Z" fill="rgba(0,0,0,0.2)" filter="blur(3px)" />

                            {/* Pencil */}
                            <path d="M25,25 L65,65" stroke="#FFC107" strokeWidth="6" strokeLinecap="round" />
                            <path d="M25,25 L30,30" stroke="#333" strokeWidth="6" strokeLinecap="round" /> {/* Lead */}

                            {/* Fingers */}
                            <path d="M50,45 Q65,45 70,60" stroke="#F5D0C5" strokeWidth="12" strokeLinecap="round" />
                            <path d="M55,55 Q65,60 65,70" stroke="#F5D0C5" strokeWidth="12" strokeLinecap="round" />
                            <path d="M45,35 Q60,30 75,40" stroke="#F5D0C5" strokeWidth="12" strokeLinecap="round" /> {/* Thumb */}

                            {/* Hand Base */}
                            <path d="M70,50 Q90,60 90,90" stroke="#F5D0C5" strokeWidth="25" strokeLinecap="round" />
                        </g>
                    </svg>
                </div>
            </div>

            <div className="drawing-status">
                <p className="status-title">✍️ 스케치 중...</p>
                <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
            </div>

            <style jsx>{`
                .hand-sketch-animation {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                }

                .sketch-paper {
                    position: relative;
                    width: 200px;
                    height: 260px;
                    background: #f0f0f0; /* Paper color */
                    border-radius: 4px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                }

                .sketch-canvas {
                    width: 100%;
                    height: 100%;
                }

                .pencil-stroke {
                    fill: none;
                    stroke: #444; /* Graphite color */
                    stroke-width: 2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    transition: opacity 0.2s;
                }
                
                .pencil-scribble {
                    fill: none;
                    stroke: #444;
                    stroke-width: 1;
                    opacity: 0.5;
                }

                .hand-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                    transition: transform 0.05s linear; /* Smooth but fast */
                    z-index: 10;
                }

                .drawing-status {
                    width: 100%;
                    text-align: center;
                }

                .status-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #ccc;
                    margin-bottom: 8px;
                }

                .progress-bar-bg {
                    width: 100%;
                    height: 6px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                    overflow: hidden;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: var(--accent-color);
                    transition: width 0.3s ease;
                }
            `}</style>
        </div>
    );
}
