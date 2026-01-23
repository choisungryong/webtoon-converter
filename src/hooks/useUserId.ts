'use client';

import { useState, useEffect } from 'react';
import { generateUUID } from '../utils/commonUtils';

const STORAGE_KEY = 'toonsnap_user_id';

/**
 * 사용자 ID를 관리하는 커스텀 훅
 * localStorage에서 기존 ID를 가져오거나 새로운 ID를 생성
 */
export function useUserId(): string {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const storedUserId = localStorage.getItem(STORAGE_KEY);
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newUserId = generateUUID();
      localStorage.setItem(STORAGE_KEY, newUserId);
      setUserId(newUserId);
    }
  }, []);

  return userId;
}
