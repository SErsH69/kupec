'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createApi, type Api, type AuthUser } from './api';
import { identify, resetIdentity, track } from './analytics';

const LS_KEY = 'kupec.auth.v1';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

interface AuthContextValue {
  ready: boolean;
  token: string | null;
  user: AuthUser | null;
  api: Api;
  register: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, user: null });
  const [ready, setReady] = useState(false);

  // Держим токен в ref, чтобы api-клиент всегда читал актуальное значение.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = state.token;

  const api = useMemo(() => createApi(() => tokenRef.current), []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = useCallback((s: AuthState) => {
    setState(s);
    try {
      if (s.token) localStorage.setItem(LS_KEY, JSON.stringify(s));
      else localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const auth = useCallback(
    async (
      kind: 'register' | 'login',
      email: string,
      password: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = kind === 'register' ? await api.register(email, password) : await api.login(email, password);
        persist({ token: res.token, user: res.user });
        identify(res.user.id, { email: res.user.email });
        track(kind === 'register' ? 'sign_up' : 'sign_in');
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Ошибка сети' };
      }
    },
    [api, persist],
  );

  const value: AuthContextValue = {
    ready,
    token: state.token,
    user: state.user,
    api,
    register: (email, password) => auth('register', email, password),
    login: (email, password) => auth('login', email, password),
    logout: () => {
      resetIdentity();
      track('sign_out');
      persist({ token: null, user: null });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
