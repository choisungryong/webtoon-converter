'use client';

import { useEffect, useState, useRef } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

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
    const lottieRef = useRef<LottieRefCurrentProps>(null);
    const [animationData, setAnimationData] = useState<object | null>(null);

    useEffect(() => {
        // Fetch animation from public folder
        fetch('/animations/sketch.json')
            .then(res => res.json())
            .then(data => setAnimationData(data))
            .catch(err => console.error('Failed to load animation:', err));
    }, []);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '24px'
        }}>
            {/* Lottie Animation */}
            <div style={{
                width: '200px',
                height: '150px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {animationData ? (
                    <Lottie
                        lottieRef={lottieRef}
                        animationData={animationData}
                        loop={true}
                        autoplay={true}
                        style={{
                            width: '100%',
                            height: '100%'
                        }}
                    />
                ) : (
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid var(--accent-color)',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                )}
            </div>

            {/* Progress Info */}
            <div style={{
                textAlign: 'center',
                color: 'var(--text-primary)'
            }}>
                <p style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--accent-color)'
                }}>
                    {totalImages > 1
                        ? `${currentImage} / ${totalImages} 변환 중...`
                        : '변환 중...'}
                </p>

                {/* Progress Bar */}
                <div style={{
                    width: '200px',
                    height: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    margin: '0 auto'
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
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    marginTop: '8px'
                }}>
                    {progress}%
                </p>
            </div>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default SketchLottieAnimation;
