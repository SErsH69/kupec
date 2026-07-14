'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { craftMetrics, isOpen, journalSummary, money, tradePnl, type Trade } from '@kupec/core';
import { useJournal } from '../../lib/journal';
import { useStore } from '../../lib/store';
import { Badge, Card, StatCard } from '../ui';

type Kind = 'flip' | 'craft';

export function JournalTab() {
  const { trades, addTrade, updateTrade, closeTrade, deleteTrade } = useJournal();
  const { items, server } = useStore();
  const [editing, setEditing] = useState<Trade | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const summary = useMemo(() => journalSummary(trades), [trades]);
  const ordered = useMemo(
    () => [...trades].sort((a, b) => Number(isOpen(a) ? 0 : 1) - Number(isOpen(b) ? 0 : 1) || b.createdAt - a.createdAt),
    [trades],
  );
  const itemNames = useMemo(
    () => Array.from(new Set(items.map((i) => i.name).filter(Boolean))),
    [items],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Открыто позиций"
          value={summary.open}
          hint={`вложено ${money(summary.invested)}`}
        />
        <StatCard
          label="Сейчас в продаже"
          value={money(summary.listedValue)}
          hint={`${summary.listedUnits} шт по выставл.`}
          tone="accent"
        />
        <StatCard
          label="Реализовано"
          value={money(summary.realized)}
          hint={`ROI ${summary.roi.toFixed(0)}% по закрытым`}
          tone={summary.realized >= 0 ? 'green' : 'red'}
        />
        <StatCard label="Закрыто" value={summary.closed} />
        <StatCard label="Всего сделок" value={summary.open + summary.closed} />
      </div>

      <div>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Добавить сделку
        </button>
      </div>

      {addOpen && (
        <Modal onClose={() => setAddOpen(false)} title="Новая сделка" wide>
          <AddTradeForm
            onAdd={addTrade}
            items={itemNames}
            server={server}
            onDone={() => setAddOpen(false)}
          />
        </Modal>
      )}

      {ordered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">Журнал пуст. Добавь сделку выше.</Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {ordered.map((t) =>
            t.kind === 'craft' ? (
              <CraftCard key={t.id} t={t} onEdit={() => setEditing(t)} onDelete={() => deleteTrade(t.id)} />
            ) : (
              <FlipCard key={t.id} t={t} onSell={() => setEditing(t)} onDelete={() => deleteTrade(t.id)} />
            ),
          )}
        </div>
      )}

      {editing && (
        <EditModal
          trade={editing}
          onClose={() => setEditing(null)}
          onCraft={(patch) => {
            updateTrade(editing.id, patch);
            setEditing(null);
          }}
          onFlip={(sell) => {
            closeTrade(editing.id, sell);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- карточки ---------------- */

function CraftCard({ t, onEdit, onDelete }: { t: Trade; onEdit: () => void; onDelete: () => void }) {
  const m = craftMetrics(t);
  const date = new Date(t.createdAt).toLocaleDateString('ru-RU');
  return (
    <Card className={`p-4 ${m.open ? '' : 'opacity-90'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold">{t.item}</span>
            <Badge tone="amber">🔨 крафт</Badge>
            {m.open && <Badge tone="accent">открыта</Badge>}
          </div>
          <div className="mt-0.5 text-xs text-muted">{date}</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold tabular-nums ${m.realized >= 0 ? 'text-green' : 'text-red'}`}>
            {money(m.realized)}
          </div>
          {m.roi != null && <div className="text-xs text-muted">+{m.roi.toFixed(0)}%</div>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Row label="материалы" value={money(m.materials)} />
        <Row label="скрафчено" value={`${m.crafted} шт`} />
        <Row label="себест/шт" value={money(m.costPerUnit)} />
        <Row label="продано" value={`${m.soldUnits}/${m.crafted} шт`} />
        <Row label="выставл/шт" value={m.listPrice != null ? money(m.listPrice) : '—'} />
        <Row label="выручка" value={money(m.soldRevenue)} />
      </div>

      <div className="mt-3 flex gap-2 border-t border-line/50 pt-3">
        <button onClick={onEdit} className="rounded-md bg-green/15 px-2.5 py-1 text-xs font-medium text-green hover:bg-green/25">
          {m.open ? 'Продать / правка' : 'Правка'}
        </button>
        <button onClick={onDelete} className="rounded-md px-2.5 py-1 text-xs text-muted hover:bg-red/15 hover:text-red">
          Удалить
        </button>
      </div>
    </Card>
  );
}

function FlipCard({ t, onSell, onDelete }: { t: Trade; onSell: () => void; onDelete: () => void }) {
  const p = tradePnl(t);
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold">{t.item}</span>
            <Badge>💱 перекуп</Badge>
            {p.open && <Badge tone="accent">открыта</Badge>}
          </div>
          <div className="mt-1 text-xs text-muted">
            {t.qty} шт · купил {money(t.buy)}
            {t.sell != null && <> → продал {money(t.sell)}</>}
          </div>
        </div>
        <div className="text-right">
          {p.pnl == null ? (
            <div className="text-sm text-muted">в рынке</div>
          ) : (
            <>
              <div className={`text-lg font-bold tabular-nums ${p.pnl >= 0 ? 'text-green' : 'text-red'}`}>
                {money(p.pnl)}
              </div>
              <div className="text-xs text-muted">{p.roi!.toFixed(0)}%</div>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2 border-t border-line/50 pt-3">
        {p.open && (
          <button onClick={onSell} className="rounded-md bg-green/15 px-2.5 py-1 text-xs font-medium text-green hover:bg-green/25">
            Продать
          </button>
        )}
        <button onClick={onDelete} className="rounded-md px-2.5 py-1 text-xs text-muted hover:bg-red/15 hover:text-red">
          Удалить
        </button>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/* ---------------- форма добавления ---------------- */

function AddTradeForm({
  onAdd,
  items,
  server,
  onDone,
}: {
  onAdd: (t: import('../../lib/api').TradeInput) => void;
  items: string[];
  server: string;
  onDone?: () => void;
}) {
  const [kind, setKind] = useState<Kind>('flip');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('');
  const [buy, setBuy] = useState('');
  const [materials, setMaterials] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [sold, setSold] = useState('');

  const reset = () => {
    setItem('');
    setQty('');
    setBuy('');
    setMaterials('');
    setListPrice('');
    setSold('');
  };

  const submit = () => {
    const q = Number(qty) || 0;
    if (!item.trim() || q <= 0) return;
    if (kind === 'flip') {
      const b = Number(buy) || 0;
      if (b <= 0) return;
      onAdd({ item: item.trim(), qty: q, buy: b, server });
    } else {
      const mat = Number(materials) || 0;
      if (mat <= 0) return;
      const lp = Number(listPrice) || 0;
      const su = Math.min(Number(sold) || 0, q);
      onAdd({
        item: item.trim(),
        qty: q,
        buy: mat / q,
        kind: 'craft',
        materials: mat,
        listPrice: lp || null,
        soldUnits: su || null,
        soldRevenue: lp && su ? lp * su : null,
        server,
      });
    }
    reset();
    onDone?.();
  };

  return (
    <div>
      <div className="mb-3 flex w-fit rounded-lg bg-bg p-1 text-sm">
        <button
          onClick={() => setKind('flip')}
          className={`rounded-md px-3 py-1 ${kind === 'flip' ? 'bg-surface-2 font-medium text-txt' : 'text-muted'}`}
        >
          💱 Перекуп
        </button>
        <button
          onClick={() => setKind('craft')}
          className={`rounded-md px-3 py-1 ${kind === 'craft' ? 'bg-surface-2 font-medium text-txt' : 'text-muted'}`}
        >
          🔨 Крафт
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Товар" className="min-w-44 flex-1">
          <input
            list="journal-items"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Название…"
            className={inputCls}
          />
          <datalist id="journal-items">
            {items.slice(0, 500).map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>

        {kind === 'flip' ? (
          <>
            <Field label="Кол-во">
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputCls} w-24`} />
            </Field>
            <Field label="Цена покупки">
              <input type="number" value={buy} onChange={(e) => setBuy(e.target.value)} placeholder="за шт." className={`${inputCls} w-32`} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Скрафчено">
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputCls} w-24`} />
            </Field>
            <Field label="Материалы (всего)">
              <input type="number" value={materials} onChange={(e) => setMaterials(e.target.value)} className={`${inputCls} w-36`} />
            </Field>
            <Field label="Выставл/шт">
              <input type="number" value={listPrice} onChange={(e) => setListPrice(e.target.value)} className={`${inputCls} w-28`} />
            </Field>
            <Field label="Продано">
              <input type="number" value={sold} onChange={(e) => setSold(e.target.value)} placeholder="0" className={`${inputCls} w-20`} />
            </Field>
          </>
        )}

        <button onClick={submit} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          + Добавить
        </button>
      </div>
    </div>
  );
}

/* ---------------- диалог продажи/правки ---------------- */

function EditModal({
  trade,
  onClose,
  onCraft,
  onFlip,
}: {
  trade: Trade;
  onClose: () => void;
  onCraft: (patch: import('../../lib/api').TradeInput) => void;
  onFlip: (sell: number) => void;
}) {
  const isCraft = trade.kind === 'craft';
  const m = isCraft ? craftMetrics(trade) : null;
  const [sell, setSell] = useState('');
  const [sold, setSold] = useState(m ? String(m.soldUnits) : '');
  const [revenue, setRevenue] = useState(m && m.soldRevenue ? String(m.soldRevenue) : '');
  const [listPrice, setListPrice] = useState(m && m.listPrice != null ? String(m.listPrice) : '');

  const confirm = () => {
    if (isCraft) {
      const su = Math.min(Number(sold) || 0, trade.qty);
      const lp = Number(listPrice) || 0;
      const rev = Number(revenue) || (lp ? lp * su : 0);
      onCraft({
        item: trade.item,
        qty: trade.qty,
        buy: trade.buy,
        kind: 'craft',
        soldUnits: su,
        soldRevenue: rev || null,
        listPrice: lp || null,
      });
    } else {
      const s = Number(sell) || 0;
      if (s > 0) onFlip(s);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[var(--radius-xl)] border border-line bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold">
          {isCraft ? 'Крафт: продажа / правка' : 'Продать'} — {trade.item}
        </h2>
        {isCraft ? (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted">Продано штук (всего, из {trade.qty})</label>
            <input type="number" value={sold} onChange={(e) => setSold(e.target.value)} className={inputCls} autoFocus />
            <label className="text-xs text-muted">Цена выставления за шт.</label>
            <input type="number" value={listPrice} onChange={(e) => setListPrice(e.target.value)} className={inputCls} />
            <label className="text-xs text-muted">Выручка (всего, необязательно)</label>
            <input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="иначе = выставл × продано" className={inputCls} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted">Цена продажи за шт. ({trade.qty} шт)</label>
            <input type="number" value={sell} onChange={(e) => setSell(e.target.value)} className={inputCls} autoFocus />
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-2">
            Отмена
          </button>
          <button onClick={confirm} className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-sm'} rounded-[var(--radius-xl)] border border-line bg-surface p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-txt">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  'rounded-lg border border-line bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent';

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}
