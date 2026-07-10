'use client';

import { useMemo } from 'react';
import { computeKitchen, money, type KitchenResult } from '@kupec/core';
import { useStore } from '../../lib/store';
import { Badge, Card, DataTable, type Column } from '../ui';

const columns: Column<KitchenResult>[] = [
  {
    key: 'name',
    header: 'Блюдо',
    sortVal: (r) => r.name,
    render: (r) => (
      <span className="flex items-center gap-2">
        <span className="truncate">{r.name}</span>
        <Badge>ур.{r.lvl}</Badge>
        {r.dishUnknown && <Badge tone="amber">нет цены</Badge>}
      </span>
    ),
  },
  { key: 'ingCost', header: 'Ингр.', align: 'right', sortVal: (r) => r.ingCost, render: (r) => money(r.ingCost) },
  {
    key: 'dishPrice',
    header: 'Цена блюда',
    align: 'right',
    sortVal: (r) => r.dishPrice ?? -Infinity,
    render: (r) => money(r.dishPrice),
  },
  {
    key: 'profit',
    header: 'Профит (×10)',
    align: 'right',
    sortVal: (r) => r.profit ?? -Infinity,
    render: (r) =>
      r.profit == null ? '—' : (
        <span className={`font-semibold ${r.profit >= 0 ? 'text-green' : 'text-red'}`}>{money(r.profit)}</span>
      ),
  },
  {
    key: 'perHour',
    header: 'В час',
    align: 'right',
    sortVal: (r) => r.perHour ?? -Infinity,
    render: (r) => money(r.perHour),
  },
  {
    key: 'perDay',
    header: 'Спрос/д',
    align: 'right',
    sortVal: (r) => r.perDay ?? -Infinity,
    render: (r) => (r.perDay != null ? r.perDay.toFixed(1) : '—'),
  },
];

export function KitchenTab() {
  const { items } = useStore();
  const data = useMemo(() => computeKitchen(items), [items]);
  return (
    <Card>
      <DataTable
        columns={columns}
        data={data}
        defaultSort={{ key: 'perHour', dir: -1 }}
        rowKey={(r) => String(r.id)}
        empty="Импортируй раздел «Предметы» — появятся расчёты кухни."
        renderExpanded={(r) => <DishBreakdown dish={r} />}
      />
    </Card>
  );
}

function DishBreakdown({ dish }: { dish: KitchenResult }) {
  return (
    <div className="text-xs">
      <div className="mb-2 text-muted">Ингредиенты на 1 порцию:</div>
      <table className="w-full">
        <tbody>
          {dish.ingDetail.map((ing) => (
            <tr key={ing.n} className="border-b border-line/30">
              <td className="py-1 pr-2">
                {ing.n} <span className="text-muted">×{ing.amt}</span>
              </td>
              <td className="py-1 pr-2">
                <Badge>{ing.src}</Badge>
              </td>
              <td className="py-1 pr-2 text-right tabular-nums text-muted">
                {ing.price != null ? money(ing.price) : '—'}/шт
              </td>
              <td className="py-1 text-right font-medium tabular-nums">
                {ing.line != null ? money(ing.line) : '—'}
              </td>
            </tr>
          ))}
          <tr>
            <td className="pt-2 text-muted" colSpan={3}>
              Себестоимость ингредиентов
            </td>
            <td className="pt-2 text-right font-semibold tabular-nums">= {money(dish.ingCost)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
