import type { MarketRow, Trade } from '@kupec/core';

/**
 * Клиент API kupec — общий для веба и мобилки. Использует глобальный `fetch`
 * (есть и в браузере, и в React Native). `baseUrl` и `getToken` инъектируются.
 */

export interface AuthUser {
  id: string;
  email: string;
}

/** Настройки аккаунта (произвольный JSON; сейчас — имя). */
export interface AccountSettings {
  name?: string;
  [k: string]: unknown;
}

export type TradeKind = 'flip' | 'craft';

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
}

export interface GroupInfo {
  group: Group | null;
  members: { id: string; email: string }[];
}

/** Сделка группы — с автором. */
export type GroupTrade = Trade & { author?: string };

/** Точка истории цены (даты приходят строкой из JSON). */
export interface HistoryPoint {
  at: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  sold: number | null;
}

export interface TradeInput {
  item: string;
  qty: number;
  buy: number;
  sell?: number | null;
  server?: string;
  note?: string;
  kind?: TradeKind;
  materials?: number | null;
  listPrice?: number | null;
  soldUnits?: number | null;
  soldRevenue?: number | null;
}

/** Форма сделки с сервера (snake_case, даты строкой). */
interface ServerTrade {
  id: string;
  item: string;
  qty: number;
  buy: number;
  sell: number | null;
  server: string | null;
  note: string | null;
  created_at: string;
  closed_at: string | null;
  kind: string;
  materials: number | null;
  list_price: number | null;
  sold_units: number | null;
  sold_revenue: number | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function toTrade(t: ServerTrade): Trade {
  return {
    id: t.id,
    item: t.item,
    qty: t.qty,
    buy: t.buy,
    sell: t.sell,
    server: t.server ?? undefined,
    note: t.note ?? undefined,
    createdAt: new Date(t.created_at).getTime(),
    closedAt: t.closed_at ? new Date(t.closed_at).getTime() : null,
    kind: (t.kind as TradeKind) ?? 'flip',
    materials: t.materials,
    listPrice: t.list_price,
    soldUnits: t.sold_units,
    soldRevenue: t.sold_revenue,
  };
}

export function createApi(baseUrl: string, getToken: () => string | null) {
  async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const token = getToken();
    const res = await fetch(baseUrl + path, {
      ...opts,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
    });
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    if (!res.ok) throw new ApiError(res.status, (body as { error?: string }).error || res.statusText);
    return body as T;
  }

  return {
    register: (email: string, password: string) =>
      req<{ token: string; user: AuthUser }>('/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      req<{ token: string; user: AuthUser }>('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    getSettings: async () => (await req<{ settings: AccountSettings }>('/v1/settings')).settings,
    updateSettings: async (patch: Partial<AccountSettings>) =>
      (await req<{ settings: AccountSettings }>('/v1/settings', { method: 'PATCH', body: JSON.stringify(patch) }))
        .settings,
    changePassword: (currentPassword: string, newPassword: string) =>
      req<{ ok: true }>('/v1/auth/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    getMarket: (server: string) => req<{ rows: MarketRow[] }>(`/v1/market/${server}`),
    /** Опросить сервер вживую (сервер → БД) и вернуть свежие строки. */
    refresh: (server: string) => req<{ rows: MarketRow[] }>(`/v1/refresh/${server}`, { method: 'POST' }),
    /** История цены предмета из наших снимков (глубже 30-дневного окна API). */
    getHistory: (server: string, path: string, id: string) =>
      req<{ points: HistoryPoint[] }>(`/v1/history/${server}/${path}/${id}`),
    listTrades: async () => (await req<{ trades: ServerTrade[] }>('/v1/trades')).trades.map(toTrade),
    addTrade: async (t: TradeInput) =>
      toTrade((await req<{ trade: ServerTrade }>('/v1/trades', { method: 'POST', body: JSON.stringify(t) })).trade),
    updateTrade: async (id: string, patch: Partial<TradeInput>) =>
      toTrade(
        (await req<{ trade: ServerTrade }>(`/v1/trades/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }))
          .trade,
      ),
    closeTrade: (id: string, sell: number) =>
      req<{ ok: true }>(`/v1/trades/${id}/close`, { method: 'POST', body: JSON.stringify({ sell }) }),
    deleteTrade: (id: string) => req<{ ok: true }>(`/v1/trades/${id}`, { method: 'DELETE' }),

    /** Группа (общий журнал семьи/банды). */
    getGroup: () => req<GroupInfo>('/v1/group'),
    createGroup: (name: string) =>
      req<GroupInfo>('/v1/group', { method: 'POST', body: JSON.stringify({ name }) }),
    joinGroup: (code: string) =>
      req<GroupInfo>('/v1/group/join', { method: 'POST', body: JSON.stringify({ code }) }),
    leaveGroup: () => req<{ ok: true }>('/v1/group/leave', { method: 'POST' }),
    listGroupTrades: async () =>
      (await req<{ trades: (ServerTrade & { author: string | null })[] }>('/v1/group/trades')).trades.map(
        (t) => ({ ...toTrade(t), author: t.author ?? undefined }),
      ),
    addGroupTrade: async (t: TradeInput) =>
      toTrade(
        (await req<{ trade: ServerTrade }>('/v1/group/trades', { method: 'POST', body: JSON.stringify(t) }))
          .trade,
      ),
  };
}

export type Api = ReturnType<typeof createApi>;
