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

import { useTranslations } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header({
  mode,
  onModeChange,
  theme,
  onThemeChange,
}: HeaderProps) {
  const t = useTranslations('Header');

  return (
    <header className="relative mb-6 w-full">
      {/* Language Switcher - Left Top */}
      <div className="absolute left-0 top-0">
        <LanguageSwitcher />
      </div>

      {/* Theme Toggle - Right Top */}
      <button
        onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
        className="absolute right-0 top-0 flex size-10 cursor-pointer items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)]"
      >
        {theme === 'dark' ? (
          <SunOutlined className="text-lg text-[var(--accent-color)]" />
        ) : (
          <MoonOutlined className="text-lg text-[var(--accent-color)]" />
        )}
      </button>

      {/* Logo - Banana Icon + BanaToon Title */}
      <div className="flex flex-col items-center pb-6 pt-2">
        <div className="flex items-center justify-center gap-2">
          {/* Banana Icon */}
          <Image
            src="/logo.png"
            alt="BanaToon"
            width={48}
            height={40}
            className="mt-0.5 object-contain"
            priority
          />
          {/* Title Text */}
          <span className="flex items-center text-4xl font-extrabold leading-none tracking-tight">
            <span className="text-[var(--banana-color)]">Bana</span>
            <span className="text-[var(--text-primary)]">Toon</span>
          </span>
        </div>
        {/* Slogan */}
        <p className="mt-2.5 text-[15px] font-medium tracking-wider text-[var(--text-secondary)] opacity-90">
          {t('slogan')}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex gap-1 rounded-btn border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
          {(['video', 'photo', 'gallery'] as AppMode[]).map((m) => {
            const isActive = mode === m;
            return (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`cursor-pointer rounded-[10px] border-none px-5 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-[var(--accent-color)] font-semibold text-[var(--accent-on-color)] shadow-accent'
                    : 'bg-transparent font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m === 'photo' && `📷 ${t('photo')}`}
                {m === 'video' && `🎬 ${t('video')}`}
                {m === 'gallery' && `🖼 ${t('gallery')}`}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
