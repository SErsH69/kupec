'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Trade } from '@kupec/core';
import { useAuth } from './auth';

const LS_KEY = 'kupec.journal.v1';

interface JournalContextValue {
  ready: boolean;
  /** Синхронизируется с аккаунтом (иначе — только localStorage). */
  synced: boolean;
  trades: Trade[];
  addTrade: (t: { item: string; qty: number; buy: number; sell?: number | null; server?: string; note?: string }) => void;
  closeTrade: (id: string, sell: number) => void;
  deleteTrade: (id: string) => void;
}

const JournalContext = createContext<JournalContextValue | null>(null);

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 't' + Date.now() + Math.round(Math.random() * 1e6);
  }
}

function readLocal(): Trade[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
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

  // Загрузка/синхронизация при смене статуса входа.
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    (async () => {
      if (token) {
        // Миграция локальных сделок в аккаунт (один раз), затем чтение с сервера.
        const local = readLocal();
        if (local.length) {
          for (const t of local) {
            try {
              await api.addTrade({ item: t.item, qty: t.qty, buy: t.buy, sell: t.sell, server: t.server, note: t.note });
            } catch {
              /* ignore */
            }
          }
          try {
            localStorage.removeItem(LS_KEY);
          } catch {
            /* ignore */
          }
        }
        try {
          const server = await api.listTrades();
          if (!cancelled) setTrades(server);
        } catch {
          if (!cancelled) setTrades([]);
        }
      } else {
        setTrades(readLocal());
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, token, api]);

  // Персист в localStorage только в локальном режиме.
  useEffect(() => {
    if (!ready || synced) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(trades));
    } catch {
      /* ignore */
    }
  }, [trades, ready, synced]);

  const addTrade = useCallback<JournalContextValue['addTrade']>(
    (t) => {
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
          note: t.note,
          createdAt: Date.now(),
          closedAt: t.sell != null ? Date.now() : null,
        },
        ...prev,
      ]);
    },
    [synced, api],
  );

  const closeTrade = useCallback(
    (id: string, sell: number) => {
      if (synced) {
        api.closeTrade(id, sell).catch(() => {});
      }
      setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, sell, closedAt: Date.now() } : t)));
    },
    [synced, api],
  );

  const deleteTrade = useCallback(
    (id: string) => {
      if (synced) {
        api.deleteTrade(id).catch(() => {});
      }
      setTrades((prev) => prev.filter((t) => t.id !== id));
    },
    [synced, api],
  );

  return (
    <JournalContext.Provider value={{ ready, synced, trades, addTrade, closeTrade, deleteTrade }}>
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal(): JournalContextValue {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used within JournalProvider');
  return ctx;
}
