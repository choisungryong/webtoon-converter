'use client';

import React from 'react';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import Link from 'next/link';

export type AppMode = 'photo' | 'video';
export type ThemeMode = 'dark' | 'light';

interface HeaderProps {
    mode: AppMode;
    onModeChange: (mode: AppMode) => void;
    theme: ThemeMode;
    onThemeChange: (theme: ThemeMode) => void;
}

export default function Header({ mode, onModeChange, theme, onThemeChange }: HeaderProps) {
    return (
        <header className="w-full mb-6 relative">
            {/* Theme Toggle - Fixed Right Top */}
            <button
                onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                className="absolute right-0 top-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{
                    background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }}
                title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
            >
                {theme === 'dark' ? (
                    <SunOutlined style={{ color: '#CCFF00', fontSize: '18px' }} />
                ) : (
                    <MoonOutlined style={{ color: '#333', fontSize: '18px' }} />
                )}
            </button>

            {/* Logo - Centered */}
            <div className="flex flex-col items-center pt-2 pb-4">
                <Link href="/" className="flex flex-col items-center hover:opacity-80 transition-opacity">
                    {/* Logo Icon */}
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2"
                        style={{
                            background: 'linear-gradient(135deg, #CCFF00 0%, #9FE000 50%, #00C853 100%)',
                            boxShadow: '0 4px 20px rgba(204, 255, 0, 0.4)'
                        }}
                    >
                        <span style={{ fontSize: '28px' }}>🎨</span>
                    </div>
                    {/* Logo Text */}
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-color)' }}>
                        Toon<span style={{ color: '#CCFF00' }}>Snap</span>
                    </h1>
                    <span className="text-xs mt-1" style={{ color: 'var(--text-muted)', letterSpacing: '2px' }}>
                        AI WEBTOON CONVERTER
                    </span>
                </Link>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-center gap-4">
                {/* Gallery Link */}
                <Link
                    href="/gallery"
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                        color: '#CCFF00',
                        background: 'rgba(204, 255, 0, 0.1)'
                    }}
                >
                    🖼 갤러리
                </Link>

                {/* Mode Switcher */}
                <div className="mode-switcher">
                    <button
                        className={`mode-btn ${mode === 'photo' ? 'active' : ''}`}
                        onClick={() => onModeChange('photo')}
                    >
                        📷 사진
                    </button>
                    <button
                        className={`mode-btn ${mode === 'video' ? 'active' : ''}`}
                        onClick={() => onModeChange('video')}
                    >
                        🎬 영상
                    </button>
                </div>
            </div>
        </header>
    );
}
