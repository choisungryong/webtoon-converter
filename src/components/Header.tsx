'use client';

import React from 'react';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import Link from 'next/link';

export type AppMode = 'photo' | 'video' | 'gallery';
export type ThemeMode = 'dark' | 'light';

interface HeaderProps {
    mode: AppMode;
    onModeChange: (mode: AppMode) => void;
    theme: ThemeMode;
    onThemeChange: (theme: ThemeMode) => void;
}

export default function Header({ mode, onModeChange, theme, onThemeChange }: HeaderProps) {
    return (
        <header className="w-full mb-8 relative">
            {/* Theme Toggle - Right Top */}
            <button
                onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                className="absolute right-0 top-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                }}
            >
                {theme === 'dark' ? (
                    <SunOutlined style={{ color: '#CCFF00', fontSize: '18px' }} />
                ) : (
                    <MoonOutlined style={{ color: '#7C3AED', fontSize: '18px' }} />
                )}
            </button>

            {/* Logo - Centered */}
            <div className="flex flex-col items-center pt-2 pb-6">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    {/* Logo Icon */}
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                            background: theme === 'dark'
                                ? 'linear-gradient(135deg, #CCFF00 0%, #00C853 100%)'
                                : 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
                            boxShadow: theme === 'dark'
                                ? '0 4px 15px rgba(204, 255, 0, 0.3)'
                                : '0 4px 15px rgba(124, 58, 237, 0.3)'
                        }}
                    >
                        <span style={{ fontSize: '24px' }}>🎨</span>
                    </div>
                    <span
                        className="text-2xl font-bold"
                        style={{
                            color: theme === 'dark' ? '#CCFF00' : '#7C3AED'
                        }}
                    >
                        ToonSnap
                    </span>
                </Link>
            </div>

            {/* Tab Switcher - 사진/영상/갤러리 같은 크기 */}
            <div className="flex justify-center">
                <div className="tab-switcher">
                    <button
                        className={`tab-btn ${mode === 'photo' ? 'active' : ''}`}
                        onClick={() => onModeChange('photo')}
                    >
                        📷 사진
                    </button>
                    <button
                        className={`tab-btn ${mode === 'video' ? 'active' : ''}`}
                        onClick={() => onModeChange('video')}
                    >
                        🎬 영상
                    </button>
                    <button
                        className={`tab-btn ${mode === 'gallery' ? 'active' : ''}`}
                        onClick={() => onModeChange('gallery')}
                    >
                        🖼 갤러리
                    </button>
                </div>
            </div>
        </header>
    );
}
