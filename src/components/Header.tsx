'use client';

import React from 'react';
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

            {/* Logo - Centered, Simple */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: '8px',
                paddingBottom: '24px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: theme === 'dark'
                            ? 'linear-gradient(135deg, #CCFF00, #00C853)'
                            : 'linear-gradient(135deg, #7C3AED, #A855F7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: theme === 'dark'
                            ? '0 4px 20px rgba(204, 255, 0, 0.3)'
                            : '0 4px 20px rgba(124, 58, 237, 0.3)'
                    }}>
                        <span style={{ fontSize: '24px' }}>🎨</span>
                    </div>
                    <span style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: accentColor
                    }}>
                        ToonSnap
                    </span>
                </div>
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
