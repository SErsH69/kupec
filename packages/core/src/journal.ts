/**
 * Журнал сделок — «своя» функция продукта (не данные Majestic). Чистая логика
 * расчёта P&L; хранение/синхрон — на уровне приложения (localStorage → аккаунты).
 */

/** Сделка перекупа/крафта. `sell == null` — позиция ещё открыта. */
export interface Trade {
  id: string;
  /** Название товара. */
  item: string;
  /** Количество. */
  qty: number;
  /** Цена покупки за штуку. */
  buy: number;
  /** Цена продажи за штуку (null — не продано). */
  sell: number | null;
  /** Сервер, где сделка (опционально). */
  server?: string;
  note?: string;
  /** Время создания, мс. */
  createdAt: number;
  /** Время закрытия, мс (null/undefined — открыта). */
  closedAt?: number | null;
}

export interface TradePnl {
  /** Вложено = qty*buy. */
  cost: number;
  /** Выручка = qty*sell (null, если открыта). */
  revenue: number | null;
  /** Прибыль/убыток (null, если открыта). */
  pnl: number | null;
  /** ROI, % (null, если открыта или cost=0). */
  roi: number | null;
  open: boolean;
}

/** P&L одной сделки. */
export function tradePnl(t: Trade): TradePnl {
  const cost = t.qty * t.buy;
  const open = t.sell == null;
  const revenue = open ? null : t.qty * (t.sell as number);
  const pnl = revenue == null ? null : revenue - cost;
  const roi = pnl != null && cost > 0 ? (pnl / cost) * 100 : null;
  return { cost, revenue, pnl, roi, open };
}

export interface JournalSummary {
  /** Открытых позиций. */
  open: number;
  /** Закрытых сделок. */
  closed: number;
  /** Вложено в открытые позиции (деньги «в рынке»). */
  invested: number;
  /** Реализованная прибыль (сумма P&L закрытых). */
  realized: number;
  /** Общий ROI по закрытым сделкам, %. */
  roi: number;
}

/** Сводка по журналу. */
export function journalSummary(trades: Trade[]): JournalSummary {
  let open = 0;
  let closed = 0;
  let invested = 0;
  let realized = 0;
  let closedCost = 0;

  for (const t of trades) {
    const p = tradePnl(t);
    if (p.open) {
      open++;
      invested += p.cost;
    } else {
      closed++;
      realized += p.pnl ?? 0;
      closedCost += p.cost;
    }
  }

  const roi = closedCost > 0 ? (realized / closedCost) * 100 : 0;
  return { open, closed, invested, realized, roi };
}
