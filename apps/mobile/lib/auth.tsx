import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { createApi, type Api, type AuthUser } from '@kupec/client';

const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';
const KEY = 'kupec.auth.v1';

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

  const tokenRef = useRef<string | null>(null);
  tokenRef.current = state.token;
  const api = useMemo(() => createApi(BASE, () => tokenRef.current), []);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setState(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((s: AuthState) => {
    setState(s);
    if (s.token) AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
    else AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  const auth = useCallback(
    async (kind: 'register' | 'login', email: string, password: string) => {
      try {
        const res = kind === 'register' ? await api.register(email, password) : await api.login(email, password);
        persist({ token: res.token, user: res.user });
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
    logout: () => persist({ token: null, user: null }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
