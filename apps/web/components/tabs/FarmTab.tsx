'use client';

import { useMemo } from 'react';
import { computeFarm, money, nf, type FarmRow } from '@kupec/core';
import { useStore } from '../../lib/store';
import { Badge, Card, DataTable, type Column } from '../ui';

const columns: Column<FarmRow>[] = [
  {
    key: 'name',
    header: 'Сырьё',
    sortVal: (r) => r.name,
    render: (r) => (
      <span className="flex items-center gap-2">
        <span className="truncate">{r.name}</span>
        <Badge tone="accent">{r.farmCat}</Badge>
      </span>
    ),
  },
  { key: 'avg', header: 'Цена', align: 'right', sortVal: (r) => r.avg ?? 0, render: (r) => money(r.avg) },
  { key: 'sold', header: 'Продано', align: 'right', sortVal: (r) => r.sold ?? 0, render: (r) => nf(r.sold) },
  {
    key: 'turnover',
    header: 'Оборот',
    align: 'right',
    sortVal: (r) => r.turnover ?? 0,
    render: (r) => money(r.turnover),
  },
];

export function FarmTab() {
  const { items } = useStore();
  const data = useMemo(() => computeFarm(items), [items]);
  return (
    <Card>
      <DataTable
        columns={columns}
        data={data}
        defaultSort={{ key: 'turnover', dir: -1 }}
        rowKey={(r) => String(r.id)}
        empty="Импортируй раздел «Предметы» — появится сырьё для фарма."
      />
    </Card>
  );
}
