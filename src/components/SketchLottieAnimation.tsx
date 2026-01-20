'use client';

import { useEffect, useRef } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

// Import your animation JSON here
// You can either import directly or fetch from public folder
import sketchAnimation from '../../public/animations/sketch.json';

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
                <Lottie
                    lottieRef={lottieRef}
                    animationData={sketchAnimation}
                    loop={true}
                    autoplay={true}
                    style={{
                        width: '100%',
                        height: '100%'
                    }}
                />
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
        </div>
    );
};

export default SketchLottieAnimation;
