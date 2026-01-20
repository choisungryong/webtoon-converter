'use client';

import { useEffect, useState } from 'react';

interface SketchLottieAnimationProps {
    progress: number;
    currentImage: number;
    totalImages: number;
}

const SketchLottieAnimation = ({
    progress,
    currentImage,
    totalImages
}: SketchLottieAnimationProps) => {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 400);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px'
        }}>
            {/* Marquee Text */}
            <div style={{
                width: '100%',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
            }}>
                <div style={{
                    display: 'inline-block',
                    animation: 'marquee 8s linear infinite',
                    color: 'var(--accent-color)',
                    fontSize: '14px',
                    fontWeight: 600
                }}>
                    ✏️ 스케치중{dots} &nbsp;&nbsp;&nbsp; 🎨 웹툰 스타일 적용중{dots} &nbsp;&nbsp;&nbsp; ✨ AI가 열심히 그리는 중{dots} &nbsp;&nbsp;&nbsp;
                    ✏️ 스케치중{dots} &nbsp;&nbsp;&nbsp; 🎨 웹툰 스타일 적용중{dots} &nbsp;&nbsp;&nbsp; ✨ AI가 열심히 그리는 중{dots} &nbsp;&nbsp;&nbsp;
                </div>
            </div>

            {/* Progress Info */}
            <div style={{
                width: '100%',
                textAlign: 'center'
            }}>
                <p style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--text-primary)'
                }}>
                    {totalImages > 1
                        ? `${currentImage} / ${totalImages} 변환 중`
                        : '변환 중'}
                </p>

                {/* Progress Bar */}
                <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: 'var(--accent-color)',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                    }} />
                </div>

                <p style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '6px'
                }}>
                    {progress}%
                </p>
            </div>

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
};

export default SketchLottieAnimation;
