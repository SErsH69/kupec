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
import { targetHit, type MarketRow, type PriceTarget } from '@kupec/core';
import { useAuth } from './auth';

/** Стабильный ключ товара для избранного/целей. */
export function rowKey(r: Pick<MarketRow, 'id' | '_path'>): string {
  return `${r._path ?? ''}:${r.id}`;
}

interface MarketContextValue {
  server: string;
  rows: MarketRow[];
  items: MarketRow[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  // избранное + цели
  isFav: (key: string) => boolean;
  toggleFav: (key: string) => void;
  favRows: MarketRow[];
  getTarget: (key: string) => PriceTarget | undefined;
  setTarget: (key: string, target: PriceTarget | null) => void;
  alertCount: number;
}

const MarketContext = createContext<MarketContextValue | null>(null);

const SERVER = 'RU17';
const MARKET_KEY = 'kupec.market.v1';
const FAV_KEY = 'kupec.favorites.v1';

export function MarketProvider({ children }: { children: ReactNode }) {
  const { api } = useAuth();
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [targets, setTargets] = useState<Record<string, PriceTarget>>({});
  const [favReady, setFavReady] = useState(false);

  // Гидрация рынка и избранного из AsyncStorage.
  useEffect(() => {
    AsyncStorage.getItem(MARKET_KEY)
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
    AsyncStorage.getItem(FAV_KEY)
      .then((raw) => {
        if (raw) {
          const f = JSON.parse(raw);
          setFavorites(f.favorites ?? []);
          setTargets(f.targets ?? {});
        }
      })
      .catch(() => {})
      .finally(() => setFavReady(true));
  }, []);

  // Персист избранного/целей.
  useEffect(() => {
    if (!favReady) return;
    AsyncStorage.setItem(FAV_KEY, JSON.stringify({ favorites, targets })).catch(() => {});
  }, [favorites, targets, favReady]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Опрашиваем сервер вживую (сервер → БД → сюда).
      const r = await api.refresh(SERVER).catch(() => api.getMarket(SERVER));
      setRows(r.rows);
      setLoaded(true);
      AsyncStorage.setItem(MARKET_KEY, JSON.stringify(r.rows)).catch(() => {});
    } catch {
      setError('Не удалось загрузить. Запущен ли API?');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const items = useMemo(() => rows.filter((r) => r._path === 'items'), [rows]);

  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const isFav = useCallback((key: string) => favSet.has(key), [favSet]);
  const toggleFav = useCallback((key: string) => {
    setFavorites((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);
  const getTarget = useCallback((key: string) => targets[key], [targets]);
  const setTarget = useCallback((key: string, target: PriceTarget | null) => {
    setTargets((prev) => {
      const next = { ...prev };
      if (target && target.price > 0) next[key] = target;
      else delete next[key];
      return next;
    });
  }, []);

  const favRows = useMemo(() => rows.filter((r) => favSet.has(rowKey(r))), [rows, favSet]);
  const alertCount = useMemo(
    () => favRows.filter((r) => { const t = targets[rowKey(r)]; return t && targetHit(r, t); }).length,
    [favRows, targets],
  );

  return (
    <MarketContext.Provider
      value={{
        server: SERVER,
        rows,
        items,
        loading,
        error,
        loaded,
        load,
        isFav,
        toggleFav,
        favRows,
        getTarget,
        setTarget,
        alertCount,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket(): MarketContextValue {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used within MarketProvider');
  return ctx;
}
