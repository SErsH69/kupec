'use client';

import { useMemo, useState } from 'react';
import { computeFlip, groupInt, money, planBudget, type FlipRow } from '@kupec/core';
import { useStore } from '../../lib/store';
import { Badge, Card, DataTable, StatCard, type Column } from '../ui';
import { PATH_LABEL } from '../../lib/labels';

const columns: Column<FlipRow>[] = [
  {
    key: 'name',
    header: 'Товар',
    sortVal: (r) => r.name,
    render: (r) => (
      <span className="flex items-center gap-2">
        <span className="truncate">{r.name}</span>
        <Badge>{PATH_LABEL[r._path ?? ''] ?? r._path}</Badge>
      </span>
    ),
  },
  { key: 'deal', header: 'Бери ≤', align: 'right', sortVal: (r) => r.deal, render: (r) => money(r.deal) },
  { key: 'sell', header: 'Продай', align: 'right', sortVal: (r) => r.sell, render: (r) => money(r.sell) },
  {
    key: 'profit',
    header: 'Навар',
    align: 'right',
    sortVal: (r) => r.profit,
    render: (r) => <span className="font-semibold text-green">{money(r.profit)}</span>,
  },
  { key: 'roi', header: 'ROI', align: 'right', sortVal: (r) => r.roi, render: (r) => `${r.roi.toFixed(0)}%` },
  {
    key: 'perDay',
    header: 'В день',
    align: 'right',
    sortVal: (r) => r.perDay,
    render: (r) => r.perDay.toFixed(1),
  },
  { key: 'score', header: 'Рейтинг', align: 'right', sortVal: (r) => r.score, render: (r) => money(r.score) },
];

export function FlipTab() {
  const { rows } = useStore();
  const [budget, setBudget] = useState(1_000_000);

  const flips = useMemo(() => computeFlip(rows), [rows]);
  const plan = useMemo(() => planBudget(flips, budget), [flips, budget]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Лотов для перекупа" value={flips.length} />
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Бюджет</div>
          <input
            inputMode="numeric"
            value={groupInt(budget)}
            onChange={(e) => setBudget(Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
            className="mt-1 w-full bg-transparent text-2xl font-bold tabular-nums text-txt outline-none"
          />
        </Card>
        <StatCard label="Вложишь" value={money(plan.invested)} hint={`остаток ${money(plan.left)}`} />
        <StatCard
          label="Ожид. навар"
          value={money(plan.expProfit)}
          hint={`ROI +${plan.roiTot.toFixed(0)}%`}
          tone="green"
        />
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={flips}
          defaultSort={{ key: 'score', dir: -1 }}
          rowKey={(r) => `${r._path}:${r.id}`}
          empty="Импортируй данные — здесь появятся лоты для перекупа."
        />
      </Card>
    </div>
  );
}
