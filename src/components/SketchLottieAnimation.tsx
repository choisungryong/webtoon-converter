'use client';

import { useEffect, useState } from 'react';
import { getRandomElement } from '../utils/commonUtils';

interface SketchLottieAnimationProps {
  progress: number;
  currentImage: number;
  totalImages: number;
}

// MZ세대의 감성과 서비스를 연결하는 재치 있는 문구 리스트
const messages = [
  '바나나가 펜촉을 깎고 있어요...',
  '말풍선에 바람 넣는 중...',
  '나노바나나가 잉크 채우는 중...',
  '주인공 얼굴 보정하는 중 (슈슉...)',
  '효과선 그리는 중... 콰아앙!',
  '열심히 스케치 하는중...',
  '영상을 한 컷 한 컷 인화하고 있어요.',
  '웹툰 주인공으로 변신 중인 당신!',
  '조금만 기다려주세요, 바나나가 달리는 중!',
];

const SketchLottieAnimation = ({
  progress,
  currentImage,
  totalImages,
}: SketchLottieAnimationProps) => {
  const [loadingMessage, setLoadingMessage] =
    useState('웹툰 변환을 준비 중이에요...');
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeOut(true);
      setTimeout(() => {
        setLoadingMessage(getRandomElement(messages));
        setFadeOut(false);
      }, 300);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="banatoon-loading-container">
      <div className="banatoon-loading-wrapper">
        {/* 진행 상태 표시 */}
        <p className="progress-text">
          {totalImages > 1
            ? `${currentImage} / ${totalImages} 변환 중`
            : '변환 중'}
        </p>

        {/* 로딩 트랙과 달리는 바나나 */}
        <div className="track">
          <div className="running-banana">
            <svg width="40" height="30" viewBox="0 0 140 100">
              <path
                d="M28.5,78.8 C35.5,68.5 52.5,62.5 85.5,68.5 C118.5,74.5 132.5,85.5 135.5,98.5 C138.5,111.5 125.5,122.5 95.5,118.5 C65.5,114.5 35.5,102.5 28.5,88.5 Z"
                fill="#FFD700"
                stroke="black"
                strokeWidth="4"
              />
              <path
                d="M28.5,78.8 C25.5,75.5 24.5,70.5 26.5,66.5 L31.5,63.5"
                fill="none"
                stroke="black"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* 로딩 텍스트 */}
        <div
          className="loading-text"
          style={{ opacity: fadeOut ? 0 : 1, transition: 'opacity 0.3s ease' }}
        >
          {loadingMessage}
        </div>
      </div>

      <style jsx>{`
        .banatoon-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 16px;
          width: 100%;
        }

        .banatoon-loading-wrapper {
          width: 100%;
          max-width: 500px;
          padding: 10px;
          text-align: center;
        }

        .progress-text {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 16px;
        }

        /* 로딩 트랙 */
        .track {
          width: 100%;
          height: 2px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 1px;
          position: relative;
          margin-bottom: 20px;
          overflow: visible;
        }

        /* 달리는 바나나 애니메이션 */
        .running-banana {
          position: absolute;
          left: -40px;
          top: -35px;
          animation:
            run 3s linear infinite,
            bounce 0.3s ease-in-out infinite alternate;
        }

        @keyframes run {
          0% {
            left: -10%;
          }
          100% {
            left: 110%;
          }
        }

        @keyframes bounce {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-5px);
          }
        }

        /* 텍스트 스타일 */
        .loading-text {
          font-family: 'Pretendard', sans-serif;
          font-size: 16px;
          color: #ffffff;
          font-weight: 600;
          min-height: 1.5em;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default SketchLottieAnimation;
