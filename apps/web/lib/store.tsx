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
  targetHit,
  type Goal,
  type GoalItem,
  type MarketPath,
  type MarketRow,
  type PriceTarget,
  type Snapshot,
} from '@kupec/core';
import { track } from './analytics';

type ServerData = Partial<Record<MarketPath, MarketRow[]>>;

interface StoreState {
  server: string;
  data: Record<string, ServerData>;
  history: Record<string, Snapshot[]>;
  /** Ключи избранного (`${_path}:${id}`), общие для всех серверов. */
  favorites: string[];
  /** Ценовые цели по ключу товара. */
  targets: Record<string, PriceTarget>;
  /** Проекты («прокачать дом») — списки нужных материалов. */
  goals: Goal[];
}

const LS_KEY = 'kupec.store.v1';
const EMPTY: StoreState = {
  server: 'RU17',
  data: {},
  history: {},
  favorites: [],
  targets: {},
  goals: [],
};

/** Ключ позиции проекта: одинаковые материалы в разных разделах — разные строки. */
export function itemKey(i: { name: string; section?: string }): string {
  return `${(i.section ?? '').toLowerCase()}|${i.name.trim().toLowerCase()}`;
}

/** Стабильный ключ строки рынка для избранного. */
export function rowKey(r: Pick<MarketRow, 'id' | '_path'>): string {
  return `${r._path ?? ''}:${r.id}`;
}

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
  /** Избранное. */
  isFav: (key: string) => boolean;
  toggleFav: (key: string) => void;
  /** Строки текущего сервера, отмеченные избранными. */
  favRows: MarketRow[];
  favCount: number;
  /** Ценовые цели. */
  getTarget: (key: string) => PriceTarget | undefined;
  setTarget: (key: string, target: PriceTarget | null) => void;
  /** Сколько избранных достигли цели сейчас. */
  alertCount: number;
  /** Проекты прокачки. */
  goals: Goal[];
  addGoal: (name: string) => void;
  /** Создать проект сразу со списком материалов (напр. из плана прокачки дома). */
  addGoalWithItems: (name: string, items: GoalItem[]) => void;
  renameGoal: (id: string, name: string) => void;
  removeGoal: (id: string) => void;
  /** Добавить/обновить позицию проекта (по имени материала). */
  setGoalItem: (id: string, item: GoalItem) => void;
  removeGoalItem: (id: string, name: string, section?: string) => void;
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
      track('data_import', { sections: res.sections, server: sid });
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

  const favSet = useMemo(() => new Set(state.favorites), [state.favorites]);
  const isFav = useCallback((key: string) => favSet.has(key), [favSet]);
  const toggleFav = useCallback((key: string) => {
    setState((p) => {
      const has = p.favorites.includes(key);
      track('favorite_toggle', { on: !has });
      return {
        ...p,
        favorites: has ? p.favorites.filter((k) => k !== key) : [...p.favorites, key],
      };
    });
  }, []);

  const getTarget = useCallback((key: string) => state.targets[key], [state.targets]);
  const setTarget = useCallback((key: string, target: PriceTarget | null) => {
    setState((p) => {
      const targets = { ...p.targets };
      if (target && target.price > 0) targets[key] = target;
      else delete targets[key];
      return { ...p, targets };
    });
  }, []);

  const addGoal = useCallback((name: string) => {
    const goal: Goal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || 'Проект',
      items: [],
      createdAt: Date.now(),
    };
    setState((p) => ({ ...p, goals: [...p.goals, goal] }));
    track('goal_add', {});
  }, []);

  const addGoalWithItems = useCallback((name: string, items: GoalItem[]) => {
    const goal: Goal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || 'Проект',
      items,
      createdAt: Date.now(),
    };
    setState((p) => ({ ...p, goals: [...p.goals, goal] }));
    track('goal_add', { from: 'house_upgrade', items: items.length });
  }, []);

  const renameGoal = useCallback((id: string, name: string) => {
    setState((p) => ({
      ...p,
      goals: p.goals.map((g) => (g.id === id ? { ...g, name: name.trim() || g.name } : g)),
    }));
  }, []);

  const removeGoal = useCallback((id: string) => {
    setState((p) => ({ ...p, goals: p.goals.filter((g) => g.id !== id) }));
  }, []);

  const setGoalItem = useCallback((id: string, item: GoalItem) => {
    setState((p) => ({
      ...p,
      goals: p.goals.map((g) => {
        if (g.id !== id) return g;
        const key = itemKey(item);
        const has = g.items.some((i) => itemKey(i) === key);
        return {
          ...g,
          items: has ? g.items.map((i) => (itemKey(i) === key ? { ...i, ...item } : i)) : [...g.items, item],
        };
      }),
    }));
  }, []);

  const removeGoalItem = useCallback((id: string, name: string, section?: string) => {
    const key = itemKey({ name, section });
    setState((p) => ({
      ...p,
      goals: p.goals.map((g) =>
        g.id === id ? { ...g, items: g.items.filter((i) => itemKey(i) !== key) } : g,
      ),
    }));
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

  const favRows = useMemo(() => rows.filter((r) => favSet.has(rowKey(r))), [rows, favSet]);
  const alertCount = useMemo(
    () =>
      favRows.filter((r) => {
        const t = state.targets[rowKey(r)];
        return t && targetHit(r, t);
      }).length,
    [favRows, state.targets],
  );

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
    isFav,
    toggleFav,
    favRows,
    favCount: state.favorites.length,
    getTarget,
    setTarget,
    alertCount,
    goals: state.goals,
    addGoal,
    addGoalWithItems,
    renameGoal,
    removeGoal,
    setGoalItem,
    removeGoalItem,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
