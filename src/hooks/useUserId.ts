'use client';

import { useState, useEffect } from 'react';
import { generateUUID } from '../utils/commonUtils';

const STORAGE_KEY = 'toonsnap_user_id';

/**
 * Get or create userId synchronously (for initial state).
 * Safe to call during SSR — returns '' on server.
 */
function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    const newId = generateUUID();
    localStorage.setItem(STORAGE_KEY, newId);
    return newId;
  } catch {
    return generateUUID();
  }
}

/**
 * 사용자 ID를 관리하는 커스텀 훅
 * localStorage에서 기존 ID를 가져오거나 새로운 ID를 생성
 */
export function useUserId(): string {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    setUserId(getOrCreateUserId());
  }, []);

  return userId;
}
