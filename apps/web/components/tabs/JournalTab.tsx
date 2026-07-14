'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { journalSummary, money, tradePnl, type Trade } from '@kupec/core';
import { useJournal } from '../../lib/journal';
import { useStore } from '../../lib/store';
import { Badge, Card, DataTable, StatCard, type Column } from '../ui';

export function JournalTab() {
  const { trades, addTrade, closeTrade, deleteTrade } = useJournal();
  const { items, server } = useStore();
  const [closing, setClosing] = useState<Trade | null>(null);

  const summary = useMemo(() => journalSummary(trades), [trades]);

  const columns: Column<Trade>[] = [
    {
      key: 'item',
      header: 'Товар',
      sortVal: (t) => t.item,
      render: (t) => (
        <span className="flex items-center gap-2">
          <span className="truncate">{t.item}</span>
          {tradePnl(t).open ? <Badge tone="accent">открыта</Badge> : <Badge>закрыта</Badge>}
        </span>
      ),
    },
    { key: 'qty', header: 'Кол-во', align: 'right', sortVal: (t) => t.qty, render: (t) => t.qty },
    { key: 'buy', header: 'Покупка', align: 'right', sortVal: (t) => t.buy, render: (t) => money(t.buy) },
    {
      key: 'sell',
      header: 'Продажа',
      align: 'right',
      sortVal: (t) => t.sell ?? -1,
      render: (t) => (t.sell == null ? '—' : money(t.sell)),
    },
    {
      key: 'pnl',
      header: 'P&L',
      align: 'right',
      sortVal: (t) => tradePnl(t).pnl ?? -Infinity,
      render: (t) => {
        const p = tradePnl(t);
        if (p.pnl == null) return <span className="text-muted">в рынке</span>;
        return (
          <span className={`font-semibold ${p.pnl >= 0 ? 'text-green' : 'text-red'}`}>
            {money(p.pnl)}
            <span className="ml-1 text-xs text-muted">{p.roi!.toFixed(0)}%</span>
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (t) => (
        <span className="flex justify-end gap-1.5">
          {tradePnl(t).open && (
            <button
              onClick={() => setClosing(t)}
              className="rounded-md bg-green/15 px-2 py-1 text-xs font-medium text-green hover:bg-green/25"
            >
              Продать
            </button>
          )}
          <button
            onClick={() => deleteTrade(t.id)}
            className="rounded-md px-2 py-1 text-xs text-muted hover:bg-red/15 hover:text-red"
          >
            Удалить
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Открыто позиций" value={summary.open} hint={money(summary.invested)} />
        <StatCard label="Закрыто сделок" value={summary.closed} />
        <StatCard
          label="Реализовано"
          value={money(summary.realized)}
          tone={summary.realized >= 0 ? 'green' : 'red'}
        />
        <StatCard label="ROI по закрытым" value={`${summary.roi.toFixed(0)}%`} tone="accent" />
      </div>

      <AddTradeForm
        onAdd={addTrade}
        items={Array.from(new Set(items.map((i) => i.name).filter(Boolean)))}
        server={server}
      />

      <Card>
        <DataTable
          columns={columns}
          data={trades}
          defaultSort={{ key: 'item', dir: 1 }}
          rowKey={(t) => t.id}
          empty="Журнал пуст. Добавь первую сделку выше."
        />
      </Card>

      {closing && (
        <CloseDialog
          trade={closing}
          onClose={() => setClosing(null)}
          onConfirm={(sell) => {
            closeTrade(closing.id, sell);
            setClosing(null);
          }}
        />
      )}
    </div>
  );
}

function AddTradeForm({
  onAdd,
  items,
  server,
}: {
  onAdd: (t: { item: string; qty: number; buy: number; sell?: number | null; server?: string }) => void;
  items: string[];
  server: string;
}) {
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('1');
  const [buy, setBuy] = useState('');

  const submit = () => {
    const q = Number(qty) || 0;
    const b = Number(buy) || 0;
    if (!item.trim() || q <= 0 || b <= 0) return;
    onAdd({ item: item.trim(), qty: q, buy: b, server });
    setItem('');
    setQty('1');
    setBuy('');
  };

  return (
    <Card className="flex flex-wrap items-end gap-3 p-4">
      <Field label="Товар" className="min-w-48 flex-1">
        <input
          list="journal-items"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="Название…"
          className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <datalist id="journal-items">
          {items.slice(0, 500).map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </Field>
      <Field label="Кол-во">
        <input
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-24 rounded-lg border border-line bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </Field>
      <Field label="Цена покупки">
        <input
          type="number"
          value={buy}
          onChange={(e) => setBuy(e.target.value)}
          placeholder="за шт."
          className="w-32 rounded-lg border border-line bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
      </Field>
      <button
        onClick={submit}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        + Добавить
      </button>
    </Card>
  );
}

function CloseDialog({
  trade,
  onClose,
  onConfirm,
}: {
  trade: Trade;
  onClose: () => void;
  onConfirm: (sell: number) => void;
}) {
  const [sell, setSell] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-[var(--radius-xl)] border border-line bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold">Продать: {trade.item}</h2>
        <p className="mb-3 text-sm text-muted">
          {trade.qty} шт · куплено по {money(trade.buy)}
        </p>
        <input
          type="number"
          value={sell}
          onChange={(e) => setSell(e.target.value)}
          placeholder="Цена продажи за шт."
          autoFocus
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-2">
            Отмена
          </button>
          <button
            onClick={() => {
              const s = Number(sell) || 0;
              if (s > 0) onConfirm(s);
            }}
            className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Закрыть сделку
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}
