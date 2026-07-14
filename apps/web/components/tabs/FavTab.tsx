'use client';

import { useMemo } from 'react';
import { money, sellAdvice, trendFor, trendMap, type MarketRow } from '@kupec/core';
import { rowKey, useStore } from '../../lib/store';
import { Badge, Card, DataTable, FavStar, type Column } from '../ui';
import { PATH_LABEL } from '../../lib/labels';

export function FavTab() {
  const { favRows, history, isFav, toggleFav } = useStore();
  const trends = useMemo(() => trendMap(history), [history]);

  const columns: Column<MarketRow>[] = [
    {
      key: 'fav',
      header: '',
      render: (r) => {
        const k = rowKey(r);
        return <FavStar active={isFav(k)} onClick={() => toggleFav(k)} />;
      },
    },
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
      key: 'avg',
      header: 'Средняя',
      align: 'right',
      sortVal: (r) => r.avg ?? 0,
      render: (r) => money(r.avg),
    },
    {
      key: 'range',
      header: 'Мин – макс',
      align: 'right',
      sortVal: (r) => r.min ?? 0,
      render: (r) => `${money(r.min)} – ${money(r.max)}`,
    },
    {
      key: 'advice',
      header: 'Продавать ~',
      align: 'right',
      sortVal: (r) => r.avg ?? 0,
      render: (r) => {
        const a = sellAdvice(r.avg, r.min, r.max);
        return a ? money(a.fair) : '—';
      },
    },
    {
      key: 'trend',
      header: 'Тренд',
      align: 'right',
      sortVal: (r) => trendFor(trends, r) ?? 0,
      render: (r) => {
        const t = trendFor(trends, r);
        if (t == null || Math.abs(t) < 0.5) return <span className="text-muted">→</span>;
        const up = t > 0;
        return (
          <span className={up ? 'text-green' : 'text-red'}>
            {up ? '▲' : '▼'}
            {Math.abs(t).toFixed(0)}%
          </span>
        );
      },
    },
  ];

  if (favRows.length === 0) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <div className="text-4xl">🔖</div>
        <h2 className="mt-3 text-lg font-semibold">Избранное пусто</h2>
        <p className="mt-1 text-sm text-muted">
          Отметь звёздочкой ★ товары в любой вкладке — свои товары на продажу, материалы для
          прокачки дома — и следи за их ценами и движением здесь.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <DataTable
        columns={columns}
        data={favRows}
        defaultSort={{ key: 'name', dir: 1 }}
        rowKey={(r) => rowKey(r)}
      />
    </Card>
  );
}
