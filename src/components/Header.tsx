'use client';

import React from 'react';
import Image from 'next/image';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';

export type AppMode = 'photo' | 'video' | 'gallery';
export type ThemeMode = 'dark' | 'light';

interface HeaderProps {
    mode: AppMode;
    onModeChange: (mode: AppMode) => void;
    theme: ThemeMode;
    onThemeChange: (theme: ThemeMode) => void;
}

export default function Header({ mode, onModeChange, theme, onThemeChange }: HeaderProps) {
    const accentColor = theme === 'dark' ? '#CCFF00' : '#7C3AED';

    return (
        <header style={{ width: '100%', marginBottom: '24px', position: 'relative' }}>
            {/* Theme Toggle - Right Top */}
            <button
                onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                }}
            >
                {theme === 'dark' ? (
                    <SunOutlined style={{ color: '#CCFF00', fontSize: '18px' }} />
                ) : (
                    <MoonOutlined style={{ color: '#7C3AED', fontSize: '18px' }} />
                )}
            </button>

            {/* Logo - Banana Icon + BanaToon Title */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '8px',
                paddingBottom: '24px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}>
                    {/* Banana Icon */}
                    <Image
                        src="/logo.png"
                        alt="BanaToon"
                        width={48}
                        height={40}
                        style={{
                            objectFit: 'contain',
                            marginTop: '2px'
                        }}
                        priority
                    />
                    {/* Title Text */}
                    <span style={{
                        fontSize: '36px',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <span style={{ color: theme === 'dark' ? '#FFD700' : '#F59E0B' }}>Bana</span>
                        <span style={{ color: theme === 'dark' ? '#FFFFFF' : '#1a1a1a' }}>Toon</span>
                    </span>
                </div>
                {/* Slogan */}
                <p style={{
                    marginTop: '10px',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    opacity: 0.9,
                    letterSpacing: '0.05em'
                }}>
                    일상의 바이브를 툰으로 담는다
                </p>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                    display: 'inline-flex',
                    background: 'var(--bg-secondary)',
                    borderRadius: '14px',
                    padding: '4px',
                    gap: '4px',
                    border: '1px solid var(--border-color)'
                }}>
                    {(['video', 'photo', 'gallery'] as AppMode[]).map((m) => {
                        const isActive = mode === m;
                        const labels: Record<AppMode, string> = {
                            photo: '📷 사진',
                            video: '🎬 영상',
                            gallery: '🖼 갤러리'
                        };
                        return (
                            <button
                                key={m}
                                onClick={() => onModeChange(m)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    fontWeight: isActive ? 600 : 500,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    border: 'none',
                                    background: isActive ? accentColor : 'transparent',
                                    color: isActive
                                        ? (theme === 'dark' ? 'black' : 'white')
                                        : 'var(--text-secondary)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {labels[m]}
                            </button>
                        );
                    })}
                </div>
            </div>
        </header>
    );
}
