'use client';

import { useMemo } from 'react';
import { buildRL, money, type RLVehicle } from '@kupec/core';
import { useStore } from '../../lib/store';
import { Card, DataTable, type Column } from '../ui';

interface RLRow extends RLVehicle {
  market: number | null;
}

export function RLTab() {
  const { rows } = useStore();

  const marketByCode = useMemo(() => {
    const m: Record<string, number | null> = {};
    for (const r of rows) {
      if (r._path === 'vehicles') m[String(r.id)] = r.avg;
    }
    return m;
  }, [rows]);

  const data = useMemo<RLRow[]>(
    () => buildRL().map((v) => ({ ...v, market: marketByCode[v.code] ?? null })),
    [marketByCode],
  );

  const columns: Column<RLRow>[] = [
    {
      key: 'real',
      header: 'Авто',
      sortVal: (r) => r.real,
      render: (r) => (
        <span className="flex flex-col">
          <span className="truncate">{r.real}</span>
          <span className="text-xs text-muted">{r.game}</span>
        </span>
      ),
    },
    {
      key: 'gos',
      header: 'Гос-цена',
      align: 'right',
      sortVal: (r) => r.gos ?? 0,
      render: (r) => money(r.gos),
    },
    {
      key: 'market',
      header: 'Рынок',
      align: 'right',
      sortVal: (r) => r.market ?? -1,
      render: (r) => (r.market == null ? '—' : money(r.market)),
    },
  ];

  return (
    <Card>
      <DataTable
        columns={columns}
        data={data}
        defaultSort={{ key: 'gos', dir: 1 }}
        rowKey={(r) => r.code}
        empty="Нет данных по авто."
      />
    </Card>
  );
}
