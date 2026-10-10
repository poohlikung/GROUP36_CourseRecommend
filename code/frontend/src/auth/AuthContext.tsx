import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { authApi } from '../api/auth';
import type { AuthUser, LoginInput, Profile, RegisterInput, UpdateProfileInput } from '../api/auth';
import { restoreSession } from './startup';

type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  saveProfile: (input: UpdateProfileInput) => Promise<Profile>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const active = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setStatus('loading');
    try {
      const currentUser = await restoreSession(controller.signal);
      if (controller.signal.aborted) return;
      setUser(currentUser);
      setStatus(currentUser ? 'authenticated' : 'guest');
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => active.current?.abort();
  }, [refresh]);

  const login = useCallback(async (input: LoginInput) => {
    const currentUser = await authApi.login(input);
    active.current?.abort();
    setUser(currentUser);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const currentUser = await authApi.register(input);
    active.current?.abort();
    setUser(currentUser);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    active.current?.abort();
    setUser(null);
    setStatus('guest');
  }, []);

  const saveProfile = useCallback(async (input: UpdateProfileInput) => {
    const profile = await authApi.updateProfile(input);
    setUser((current) => current?.id === profile.userId
      ? { ...current, displayName: profile.displayName, email: profile.email }
      : current);
    return profile;
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, logout, refresh: () => refresh(), saveProfile }),
    [status, user, login, register, logout, refresh, saveProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
