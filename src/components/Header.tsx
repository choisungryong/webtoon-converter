'use client';

import React from 'react';
import { CameraOutlined } from '@ant-design/icons';
import Link from 'next/link';

export type AppMode = 'photo' | 'video';

interface HeaderProps {
    mode: AppMode;
    onModeChange: (mode: AppMode) => void;
}

export default function Header({ mode, onModeChange }: HeaderProps) {
    return (
        <header className="flex items-center justify-between w-full mb-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#CCFF00] to-green-500 flex items-center justify-center">
                    <CameraOutlined style={{ fontSize: '20px', color: 'black' }} />
                </div>
                <h1 className="text-2xl font-bold text-white">
                    Toon<span className="text-[#CCFF00]">Snap</span>
                </h1>
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

            {/* Gallery Link */}
            <Link href="/gallery" className="text-gray-400 hover:text-[#CCFF00] transition-colors">
                갤러리 →
            </Link>
        </header>
    );
}
