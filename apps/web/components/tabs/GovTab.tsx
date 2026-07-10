'use client';

import { useMemo, useState } from 'react';
import { GOV_PRICES, money, type GovPrice } from '@kupec/core';
import { Badge, Card, DataTable, type Column } from '../ui';

const columns: Column<GovPrice>[] = [
  { key: 'name', header: 'Товар', sortVal: (r) => r.name, render: (r) => r.name },
  {
    key: 'cat',
    header: 'Скупщик',
    sortVal: (r) => r.cat,
    render: (r) => <Badge>{r.cat}</Badge>,
  },
  {
    key: 'buy',
    header: 'Скупка',
    align: 'right',
    sortVal: (r) => r.max ?? 0,
    render: (r) => `${money(r.min)} – ${money(r.max)}`,
  },
  {
    key: 'sell',
    header: 'Продажа игроку',
    align: 'right',
    sortVal: (r) => r.pmax ?? 0,
    render: (r) => `${money(r.pmin)} – ${money(r.pmax)}`,
  },
];

export function GovTab() {
  const [q, setQ] = useState('');
  const cats = useMemo(() => Array.from(new Set(GOV_PRICES.map((g) => g.cat))).sort(), []);
  const [cat, setCat] = useState('*');

  const data = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return GOV_PRICES.filter(
      (g) => (cat === '*' || g.cat === cat) && (!ql || g.name.toLowerCase().includes(ql)),
    );
  }, [q, cat]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск товара…"
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
        >
          <option value="*">Все скупщики</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">{data.length} позиций</span>
      </div>
      <Card>
        <DataTable columns={columns} data={data} defaultSort={{ key: 'name', dir: 1 }} rowKey={(r, i) => `${r.name}:${i}`} />
      </Card>
    </div>
  );
}
