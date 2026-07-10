'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ingestMarketJson,
  recordSnapshot,
  snapshotPrices,
  type MarketPath,
  type MarketRow,
  type Snapshot,
} from '@kupec/core';

type ServerData = Partial<Record<MarketPath, MarketRow[]>>;

interface StoreState {
  server: string;
  data: Record<string, ServerData>;
  history: Record<string, Snapshot[]>;
}

const LS_KEY = 'kupec.store.v1';
const EMPTY: StoreState = { server: 'RU17', data: {}, history: {} };

interface StoreContextValue {
  ready: boolean;
  server: string;
  setServer: (s: string) => void;
  /** Все строки текущего сервера (с проставленным _path). */
  rows: MarketRow[];
  /** Строки раздела items текущего сервера. */
  items: MarketRow[];
  history: Snapshot[];
  importedPaths: MarketPath[];
  importJson: (text: string) => { ok: boolean; message: string };
  /** Загрузить готовые строки рынка (напр. с API) для сервера. */
  loadServerRows: (sid: string, rows: MarketRow[]) => void;
  clear: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function todayStr(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(EMPTY);
  const [ready, setReady] = useState(false);

  // Гидрация из localStorage после монтирования (без SSR-рассинхрона).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, ready]);

  const setServer = useCallback((s: string) => setState((p) => ({ ...p, server: s })), []);

  const importJson = useCallback(
    (text: string): { ok: boolean; message: string } => {
      if (!text.trim()) return { ok: false, message: 'Поле пустое' };
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return { ok: false, message: 'Это не корректный JSON' };
      }
      const res = ingestMarketJson(json);
      if (res.sections === 0) return { ok: false, message: 'Не удалось определить раздел в JSON' };

      const sid = res.serverId || state.server;
      setState((p) => {
        const prevData = p.data[sid] || {};
        const nextData: ServerData = { ...prevData };
        for (const [path, rows] of Object.entries(res.paths)) {
          if (rows) nextData[path as MarketPath] = rows;
        }
        const allRows = Object.values(nextData).flat() as MarketRow[];
        const prevHist = p.history[sid] || [];
        const nextHist = recordSnapshot(prevHist, snapshotPrices(allRows), todayStr());
        return {
          ...p,
          server: sid,
          data: { ...p.data, [sid]: nextData },
          history: { ...p.history, [sid]: nextHist },
        };
      });
      return { ok: true, message: `Загружено разделов: ${res.sections}` };
    },
    [state.server],
  );

  const loadServerRows = useCallback((sid: string, rows: MarketRow[]) => {
    const byPath: ServerData = {};
    for (const r of rows) {
      const p = (r._path || '') as MarketPath;
      if (!p) continue;
      (byPath[p] ||= []).push(r);
    }
    setState((p) => {
      const nextHist = recordSnapshot(p.history[sid] || [], snapshotPrices(rows), todayStr());
      return {
        ...p,
        server: sid,
        data: { ...p.data, [sid]: byPath },
        history: { ...p.history, [sid]: nextHist },
      };
    });
  }, []);

  const clear = useCallback(
    () =>
      setState((p) => ({
        ...p,
        data: { ...p.data, [p.server]: {} },
        history: { ...p.history, [p.server]: [] },
      })),
    [],
  );

  const serverData = state.data[state.server] || {};
  const rows = useMemo(
    () => Object.values(serverData).flat() as MarketRow[],
    [serverData],
  );
  const items = useMemo(() => serverData.items || [], [serverData]);
  const history = state.history[state.server] || [];
  const importedPaths = Object.keys(serverData).filter(
    (k) => (serverData[k as MarketPath]?.length ?? 0) > 0,
  ) as MarketPath[];

  const value: StoreContextValue = {
    ready,
    server: state.server,
    setServer,
    rows,
    items,
    history,
    importedPaths,
    importJson,
    loadServerRows,
    clear,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
