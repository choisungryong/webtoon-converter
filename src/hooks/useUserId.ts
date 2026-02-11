'use client';

import { useState, useEffect } from 'react';
import { generateUUID } from '../utils/commonUtils';
import { useAuth } from '../contexts/AuthContext';

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
 * 인증된 사용자는 auth user id, 미인증은 localStorage UUID
 */
export function useUserId(): string {
  const { user } = useAuth();
  const [legacyUserId, setLegacyUserId] = useState<string>('');

  useEffect(() => {
    setLegacyUserId(getOrCreateUserId());
  }, []);

  // Prefer authenticated user ID
  return user?.id || legacyUserId;
}

/**
 * Get the legacy localStorage UUID (for migration purposes)
 */
export function useLegacyUserId(): string {
  const [legacyUserId, setLegacyUserId] = useState<string>('');

  useEffect(() => {
    setLegacyUserId(getOrCreateUserId());
  }, []);

  return legacyUserId;
}
