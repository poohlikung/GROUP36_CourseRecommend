import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '../api/auth';
import type { AuthUser, LoginInput, RegisterInput } from '../api/auth';
import { ApiError } from '../api/client';

type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const currentUser = await authApi.currentUser(signal);
      setUser(currentUser);
      setStatus('authenticated');
    } catch (error) {
      if (signal?.aborted) return;
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setStatus('guest');
        return;
      }
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const login = useCallback(async (input: LoginInput) => {
    const currentUser = await authApi.login(input);
    setUser(currentUser);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const currentUser = await authApi.register(input);
    setUser(currentUser);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus('guest');
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, logout, refresh: () => refresh() }),
    [status, user, login, register, logout, refresh],
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
