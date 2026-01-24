'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function KakaoRedirect() {
  const t = useTranslations('KakaoRedirect');
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || '';

    // 카카오톡 인앱 브라우저 감지
    const isKakaoTalk = /KAKAOTALK/i.test(userAgent);

    if (isKakaoTalk) {
      const currentUrl = window.location.href;
      const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent);
      setIsIOS(isIOSDevice);

      if (isIOSDevice) {
        // iOS: 자동 리다이렉트가 어려워서 배너 표시
        setShowBanner(true);
      } else {
        // Android: intent 스킴으로 Chrome에서 열기
        const intentUrl =
          'intent://' +
          currentUrl.replace(/https?:\/\//, '') +
          '#Intent;scheme=https;package=com.android.chrome;end';

        // 약간의 딜레이 후 리다이렉트 시도
        setTimeout(() => {
          window.location.href = intentUrl;
        }, 100);

        // intent가 실패할 경우를 대비해 배너도 표시
        setTimeout(() => {
          setShowBanner(true);
        }, 500);
      }
    }
  }, []);

  const openExternalBrowser = () => {
    const currentUrl = window.location.href;

    if (isIOS) {
      // iOS Safari로 열기 시도
      window.location.href = currentUrl;
    } else {
      // Android Chrome으로 열기
      const intentUrl =
        'intent://' +
        currentUrl.replace(/https?:\/\//, '') +
        '#Intent;scheme=https;package=com.android.chrome;end';
      window.location.href = intentUrl;
    }
  };

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
        }}
      >
        <span style={{ fontSize: '20px' }}>🍌</span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#000',
          }}
        >
          {t('message')}
        </span>
      </div>
      <button
        onClick={openExternalBrowser}
        style={{
          background: '#000',
          color: '#FFD700',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {t('btn')}
      </button>
    </div>
  );
}
