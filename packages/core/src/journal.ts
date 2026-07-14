/**
 * Журнал сделок — «своя» функция продукта (не данные Majestic). Чистая логика
 * P&L. Два вида: `flip` (купил/продал) и `craft` (крафт: материалы → штуки →
 * продажа, с частичными продажами). Хранение/синхрон — на уровне приложения.
 */

export type TradeKind = 'flip' | 'craft';

/** Сделка. `flip`: sell==null — открыта. `craft`: продано soldUnits из qty. */
export interface Trade {
  id: string;
  item: string;
  /** Количество (для craft — сколько скрафчено). */
  qty: number;
  /** Цена покупки за штуку (flip; для craft — себестоимость/шт, производная). */
  buy: number;
  /** Цена продажи за штуку (flip; null — не продано). */
  sell: number | null;
  server?: string;
  note?: string;
  createdAt: number;
  closedAt?: number | null;

  /** Вид сделки (по умолчанию flip). */
  kind?: TradeKind;
  // --- поля крафта ---
  /** Суммарные затраты на материалы. */
  materials?: number | null;
  /** Цена выставления за штуку. */
  listPrice?: number | null;
  /** Сколько штук продано. */
  soldUnits?: number | null;
  /** Фактическая выручка от проданных. */
  soldRevenue?: number | null;
}

export interface TradePnl {
  cost: number;
  revenue: number | null;
  pnl: number | null;
  roi: number | null;
  open: boolean;
}

/** P&L простой (flip) сделки. */
export function tradePnl(t: Trade): TradePnl {
  const cost = t.qty * t.buy;
  const open = t.sell == null;
  const revenue = open ? null : t.qty * (t.sell as number);
  const pnl = revenue == null ? null : revenue - cost;
  const roi = pnl != null && cost > 0 ? (pnl / cost) * 100 : null;
  return { cost, revenue, pnl, roi, open };
}

export interface CraftMetrics {
  /** Скрафчено штук. */
  crafted: number;
  /** Суммарные материалы. */
  materials: number;
  /** Себестоимость за штуку. */
  costPerUnit: number;
  /** Продано штук. */
  soldUnits: number;
  /** Непроданные штуки. */
  unsold: number;
  /** Цена выставления за штуку. */
  listPrice: number | null;
  /** Выручка от проданных. */
  soldRevenue: number;
  /** Реализованная прибыль (по проданной части). */
  realized: number;
  /** ROI по проданной части, %. */
  roi: number | null;
  /** Себестоимость непроданного (деньги «в товаре»). */
  invested: number;
  /** Есть непроданные штуки. */
  open: boolean;
}

/** Метрики крафт-сделки. */
export function craftMetrics(t: Trade): CraftMetrics {
  const crafted = t.qty || 0;
  const materials = t.materials ?? (t.buy != null ? t.buy * crafted : 0);
  const costPerUnit = crafted > 0 ? materials / crafted : 0;
  const soldUnits = Math.min(t.soldUnits ?? 0, crafted);
  const listPrice = t.listPrice ?? null;
  const soldRevenue =
    t.soldRevenue ??
    (listPrice != null ? listPrice * soldUnits : t.sell != null ? t.sell * soldUnits : 0);
  const soldCost = costPerUnit * soldUnits;
  const realized = soldRevenue - soldCost;
  const roi = soldCost > 0 ? (realized / soldCost) * 100 : null;
  const unsold = crafted - soldUnits;
  const invested = costPerUnit * unsold;
  return {
    crafted,
    materials,
    costPerUnit,
    soldUnits,
    unsold,
    listPrice,
    soldRevenue,
    realized,
    roi,
    invested,
    open: unsold > 0,
  };
}

/** Открыта ли сделка (есть непроданное). */
export function isOpen(t: Trade): boolean {
  return t.kind === 'craft' ? craftMetrics(t).open : t.sell == null;
}

export interface JournalSummary {
  open: number;
  closed: number;
  /** Вложено в открытые позиции (себестоимость непроданного). */
  invested: number;
  /** Реализованная прибыль. */
  realized: number;
  /** ROI по реализованному, %. */
  roi: number;
  /** Стоимость непроданных товаров по цене выставления («сейчас в продаже»). */
  listedValue: number;
  /** Непроданных штук выставлено. */
  listedUnits: number;
}

/** Сводка по журналу (обрабатывает flip и craft). */
export function journalSummary(trades: Trade[]): JournalSummary {
  let open = 0;
  let closed = 0;
  let invested = 0;
  let realized = 0;
  let realizedCost = 0;
  let listedValue = 0;
  let listedUnits = 0;

  for (const t of trades) {
    if (t.kind === 'craft') {
      const m = craftMetrics(t);
      if (m.open) open++;
      else closed++;
      invested += m.invested;
      realized += m.realized;
      realizedCost += m.costPerUnit * m.soldUnits;
      if (m.unsold > 0 && m.listPrice != null) {
        listedValue += m.unsold * m.listPrice;
        listedUnits += m.unsold;
      }
    } else {
      const p = tradePnl(t);
      if (p.open) {
        open++;
        invested += p.cost;
      } else {
        closed++;
        realized += p.pnl ?? 0;
        realizedCost += p.cost;
      }
    }
  }

  const roi = realizedCost > 0 ? (realized / realizedCost) * 100 : 0;
  return { open, closed, invested, realized, roi, listedValue, listedUnits };
}
