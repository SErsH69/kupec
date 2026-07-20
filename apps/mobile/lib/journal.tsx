import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Trade } from '@kupec/core';
import type { Group, GroupTrade } from '@kupec/client';
import { useAuth } from './auth';

const KEY = 'kupec.journal.v1';

/** Чей журнал смотрим: свой или общий журнал группы. */
export type JournalScope = 'mine' | 'group';

interface JournalContextValue {
  ready: boolean;
  synced: boolean;
  trades: (Trade & { author?: string })[];
  addTrade: (t: { item: string; qty: number; buy: number; sell?: number | null; server?: string }) => void;
  closeTrade: (id: string, sell: number) => void;
  deleteTrade: (id: string) => void;
  /** Группа (общий журнал семьи/банды). */
  scope: JournalScope;
  setScope: (s: JournalScope) => void;
  group: Group | null;
  members: { id: string; email: string }[];
  createGroup: (name: string) => Promise<void>;
  joinGroup: (code: string) => Promise<void>;
  leaveGroup: () => Promise<void>;
}

const JournalContext = createContext<JournalContextValue | null>(null);

function uid(): string {
  return 't' + Date.now() + Math.round(Math.random() * 1e6);
}

async function readLocal(): Promise<Trade[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function JournalProvider({ children }: { children: ReactNode }) {
  const { ready: authReady, token, api } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ready, setReady] = useState(false);
  const synced = !!token;

  const [scope, setScope] = useState<JournalScope>('mine');
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<{ id: string; email: string }[]>([]);
  const [groupTrades, setGroupTrades] = useState<GroupTrade[]>([]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      if (token) {
        const local = await readLocal();
        if (local.length) {
          for (const t of local) {
            try {
              await api.addTrade({ item: t.item, qty: t.qty, buy: t.buy, sell: t.sell, server: t.server, note: t.note });
            } catch {
              /* ignore */
            }
          }
          await AsyncStorage.removeItem(KEY).catch(() => {});
        }
        try {
          const server = await api.listTrades();
          if (!cancelled) setTrades(server);
        } catch {
          if (!cancelled) setTrades([]);
        }
      } else {
        const local = await readLocal();
        if (!cancelled) setTrades(local);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, token, api]);

  useEffect(() => {
    if (!ready || synced) return;
    AsyncStorage.setItem(KEY, JSON.stringify(trades)).catch(() => {});
  }, [trades, ready, synced]);

  // Группа и её журнал — только для вошедших.
  useEffect(() => {
    if (!token) {
      setGroup(null);
      setMembers([]);
      setGroupTrades([]);
      setScope('mine');
      return;
    }
    let cancelled = false;
    api
      .getGroup()
      .then((info) => {
        if (cancelled) return;
        setGroup(info.group);
        setMembers(info.members);
        if (info.group) return api.listGroupTrades().then((t) => !cancelled && setGroupTrades(t));
        return;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, api]);

  const reloadGroup = useCallback(async () => {
    const info = await api.getGroup();
    setGroup(info.group);
    setMembers(info.members);
    setGroupTrades(info.group ? await api.listGroupTrades() : []);
  }, [api]);

  const createGroup = useCallback(
    async (name: string) => {
      await api.createGroup(name);
      await reloadGroup();
    },
    [api, reloadGroup],
  );

  const joinGroup = useCallback(
    async (code: string) => {
      await api.joinGroup(code);
      await reloadGroup();
    },
    [api, reloadGroup],
  );

  const leaveGroup = useCallback(async () => {
    await api.leaveGroup();
    setScope('mine');
    await reloadGroup();
  }, [api, reloadGroup]);

  const addTrade = useCallback<JournalContextValue['addTrade']>(
    (t) => {
      if (scope === 'group' && group) {
        api
          .addGroupTrade(t)
          .then((created) => setGroupTrades((prev) => [created, ...prev]))
          .catch(() => {});
        return;
      }
      if (synced) {
        api
          .addTrade(t)
          .then((created) => setTrades((prev) => [created, ...prev]))
          .catch(() => {});
        return;
      }
      setTrades((prev) => [
        {
          id: uid(),
          item: t.item,
          qty: t.qty,
          buy: t.buy,
          sell: t.sell ?? null,
          server: t.server,
          createdAt: Date.now(),
          closedAt: t.sell != null ? Date.now() : null,
        },
        ...prev,
      ]);
    },
    [synced, api, scope, group],
  );

  const closeTrade = useCallback(
    (id: string, sell: number) => {
      if (synced) api.closeTrade(id, sell).catch(() => {});
      const close = <T extends Trade>(t: T): T => (t.id === id ? { ...t, sell, closedAt: Date.now() } : t);
      setTrades((prev) => prev.map(close));
      setGroupTrades((prev) => prev.map(close));
    },
    [synced, api],
  );

  const deleteTrade = useCallback(
    (id: string) => {
      if (synced) api.deleteTrade(id).catch(() => {});
      setTrades((prev) => prev.filter((t) => t.id !== id));
      setGroupTrades((prev) => prev.filter((t) => t.id !== id));
    },
    [synced, api],
  );

  const visible = scope === 'group' && group ? groupTrades : trades;

  return (
    <JournalContext.Provider
      value={{
        ready,
        synced,
        trades: visible,
        addTrade,
        closeTrade,
        deleteTrade,
        scope,
        setScope,
        group,
        members,
        createGroup,
        joinGroup,
        leaveGroup,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal(): JournalContextValue {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used within JournalProvider');
  return ctx;
}
