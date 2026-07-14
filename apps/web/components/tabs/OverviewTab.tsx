'use client';

import { useMemo, useState } from 'react';
import { money, nf, sellAdvice, type MarketRow } from '@kupec/core';
import { rowKey, useStore } from '../../lib/store';
import { Badge, Card, DataTable, FavStar, type Column } from '../ui';
import { PATH_LABEL } from '../../lib/labels';

/** Колонки рынка; star-колонка добавляется отдельно (нужен доступ к стору). */
export const marketColumns: Column<MarketRow>[] = [
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

/** Star-колонка, привязанная к избранному стора. */
export function useFavColumn(): Column<MarketRow> {
  const { isFav, toggleFav } = useStore();
  return {
    key: 'fav',
    header: '',
    render: (r) => {
      const k = rowKey(r);
      return <FavStar active={isFav(k)} onClick={() => toggleFav(k)} />;
    },
  };
}

export function OverviewTab() {
  const { rows } = useStore();
  const favCol = useFavColumn();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return ql ? rows.filter((r) => r.name.toLowerCase().includes(ql)) : rows;
  }, [rows, q]);

  return (
    <div className="flex flex-col gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск товара… (напр. свои товары или материалы для дома)"
        className="w-full max-w-md rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <Card>
        <DataTable
          columns={[favCol, ...marketColumns]}
          data={filtered}
          defaultSort={{ key: 'turnover', dir: -1 }}
          rowKey={(r) => rowKey(r)}
          empty={q ? 'Ничего не найдено.' : 'Загрузи данные — кнопка «С сервера» или «Импорт».'}
        />
      </Card>
    </div>
  );
}
