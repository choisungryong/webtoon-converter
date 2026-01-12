'use client';

import React from 'react';
import { CameraOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
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
        <header className="flex flex-col items-center gap-4 w-full mb-6">
            {/* Logo - Centered */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#CCFF00] via-[#9FE000] to-green-500 flex items-center justify-center shadow-lg shadow-[#CCFF00]/30">
                    <CameraOutlined style={{ fontSize: '24px', color: 'black' }} />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold text-white leading-tight">
                        Toon<span className="text-[#CCFF00]">Snap</span>
                    </h1>
                    <span className="text-[10px] text-gray-400 tracking-wider">AI WEBTOON CONVERTER</span>
                </div>
            </Link>

            {/* Controls Row */}
            <div className="flex items-center justify-between w-full">
                {/* Gallery Link */}
                <Link href="/gallery" className="text-[#CCFF00] hover:text-white transition-colors text-sm font-medium">
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

                {/* Theme Toggle */}
                <button
                    onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
                    title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
                >
                    {theme === 'dark' ? (
                        <SunOutlined style={{ color: '#CCFF00', fontSize: '16px' }} />
                    ) : (
                        <MoonOutlined style={{ color: '#333', fontSize: '16px' }} />
                    )}
                </button>
            </div>
        </header>
    );
}
