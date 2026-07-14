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
import type { TradeInput } from './api';
import { useAuth } from './auth';
import { track } from './analytics';

const LS_KEY = 'kupec.journal.v1';

interface JournalContextValue {
  ready: boolean;
  /** Синхронизируется с аккаунтом (иначе — только localStorage). */
  synced: boolean;
  trades: Trade[];
  addTrade: (t: TradeInput) => void;
  updateTrade: (id: string, patch: Partial<TradeInput>) => void;
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
      track('trade_add', { synced });
      if (synced) {
        api
          .addTrade(t)
          .then((created) => setTrades((prev) => [created, ...prev]))
          .catch(() => {});
        return;
      }
      const soldFull =
        t.kind === 'craft' ? (t.soldUnits ?? 0) >= t.qty && (t.soldUnits ?? 0) > 0 : t.sell != null;
      setTrades((prev) => [
        {
          id: uid(),
          item: t.item,
          qty: t.qty,
          buy: t.buy,
          sell: t.sell ?? null,
          server: t.server,
          note: t.note,
          kind: t.kind ?? 'flip',
          materials: t.materials ?? null,
          listPrice: t.listPrice ?? null,
          soldUnits: t.soldUnits ?? null,
          soldRevenue: t.soldRevenue ?? null,
          createdAt: Date.now(),
          closedAt: soldFull ? Date.now() : null,
        },
        ...prev,
      ]);
    },
    [synced, api],
  );

  const updateTrade = useCallback(
    (id: string, patch: Partial<TradeInput>) => {
      if (synced) {
        api
          .updateTrade(id, patch)
          .then((upd) => setTrades((prev) => prev.map((t) => (t.id === id ? upd : t))))
          .catch(() => {});
        return;
      }
      setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [synced, api],
  );

  const closeTrade = useCallback(
    (id: string, sell: number) => {
      track('trade_close', { synced });
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
    <JournalContext.Provider value={{ ready, synced, trades, addTrade, updateTrade, closeTrade, deleteTrade }}>
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal(): JournalContextValue {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used within JournalProvider');
  return ctx;
}
