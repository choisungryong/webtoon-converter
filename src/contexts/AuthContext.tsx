'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';

export interface AuthUser {
  id: string;
  email: string | null;
  nickname: string | null;
  avatar_url: string | null;
  provider: 'kakao' | 'google';
  credits: {
    free: number;
    paid: number;
    total: number;
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (provider: 'kakao' | 'google') => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  showPricingModal: boolean;
  setShowPricingModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  showLoginModal: false,
  setShowLoginModal: () => {},
  showPricingModal: false,
  setShowPricingModal: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser(data.user || null);

      // Link legacy UUID on first login
      if (data.user && typeof window !== 'undefined') {
        const legacyId = localStorage.getItem('toonsnap_user_id');
        if (legacyId && legacyId !== data.user.id) {
          fetch('/api/auth/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ legacyUserId: legacyId }),
          }).catch(() => {});
        }
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Schedule token refresh (every 13 minutes)
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          await fetchUser();
          scheduleRefresh();
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }, 13 * 60 * 1000); // 13 minutes
  }, [fetchUser]);

  useEffect(() => {
    fetchUser().then(() => {
      scheduleRefresh();
    });
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [fetchUser, scheduleRefresh]);

  // Check URL params for auth callback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    if (params.get('auth') === 'success') {
      fetchUser();
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }

    const authError = params.get('auth_error');
    if (authError) {
      const errorMessages: Record<string, string> = {
        cancelled: '로그인이 취소되었습니다.',
        invalid_state: '로그인 세션이 만료되었습니다. 다시 시도해주세요.',
        server_error: '로그인 중 오류가 발생했습니다. 다시 시도해주세요.',
      };
      message.error({
        content: errorMessages[authError] || '로그인에 실패했습니다.',
        duration: 5,
      });
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('auth_error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [fetchUser]);

  const login = useCallback((provider: 'kakao' | 'google') => {
    window.location.href = `/api/auth/login?provider=${provider}`;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser: fetchUser,
        showLoginModal,
        setShowLoginModal,
        showPricingModal,
        setShowPricingModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
