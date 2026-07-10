import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { MarketRow } from '@kupec/core';
import { useAuth } from './auth';

interface MarketContextValue {
  server: string;
  rows: MarketRow[];
  items: MarketRow[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  load: () => Promise<void>;
}

const MarketContext = createContext<MarketContextValue | null>(null);

const SERVER = 'RU17';
const KEY = 'kupec.market.v1';

export function MarketProvider({ children }: { children: ReactNode }) {
  const { api } = useAuth();
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Гидрация последнего снимка рынка из AsyncStorage (переживает перезапуск).
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const parsed: MarketRow[] = JSON.parse(raw);
          if (parsed.length) {
            setRows(parsed);
            setLoaded(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.getMarket(SERVER);
      setRows(r.rows);
      setLoaded(true);
      AsyncStorage.setItem(KEY, JSON.stringify(r.rows)).catch(() => {});
    } catch {
      setError('Не удалось загрузить. Запущен ли API?');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const items = useMemo(() => rows.filter((r) => r._path === 'items'), [rows]);

  return (
    <MarketContext.Provider value={{ server: SERVER, rows, items, loading, error, loaded, load }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket(): MarketContextValue {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used within MarketProvider');
  return ctx;
}
