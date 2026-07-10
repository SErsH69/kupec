'use client';

import { money, nf, sellAdvice, type MarketRow } from '@kupec/core';
import { useStore } from '../../lib/store';
import { Badge, Card, DataTable, type Column } from '../ui';
import { PATH_LABEL } from '../../lib/labels';

const columns: Column<MarketRow>[] = [
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
  {
    key: 'advice',
    header: 'Продавать ~',
    align: 'right',
    sortVal: (r) => r.avg ?? 0,
    render: (r) => {
      const a = sellAdvice(r.avg, r.min, r.max);
      if (!a) return '—';
      return (
        <span
          className="cursor-help border-b border-dotted border-muted/50"
          title={`Быстро продать: ${money(a.fast)}\nСправедливо (средняя): ${money(a.fair)}\nПотолок рынка: ${money(a.top)}`}
        >
          {money(a.fair)}
        </span>
      );
    },
  },
  { key: 'sold', header: 'Продано', align: 'right', sortVal: (r) => r.sold ?? 0, render: (r) => nf(r.sold) },
  {
    key: 'perDay',
    header: 'В день',
    align: 'right',
    sortVal: (r) => r.perDay ?? 0,
    render: (r) => (r.perDay != null ? r.perDay.toFixed(1) : '—'),
  },
  {
    key: 'turnover',
    header: 'Оборот',
    align: 'right',
    sortVal: (r) => r.turnover ?? 0,
    render: (r) => money(r.turnover),
  },
];

export function OverviewTab() {
  const { rows } = useStore();
  return (
    <Card>
      <DataTable
        columns={columns}
        data={rows}
        defaultSort={{ key: 'turnover', dir: -1 }}
        rowKey={(r) => `${r._path}:${r.id}`}
      />
    </Card>
  );
}
