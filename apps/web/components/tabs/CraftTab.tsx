'use client';

import { useMemo, useState } from 'react';
import { computeRecipes, money, type CraftResult } from '@kupec/core';
import { useStore } from '../../lib/store';
import { Badge, Card, DataTable, type Column } from '../ui';

export function CraftTab() {
  const { items } = useStore();
  const [useChance, setUseChance] = useState(true);
  const [selfCraft, setSelfCraft] = useState(true);

  const data = useMemo(
    () => computeRecipes(items, { useChance, selfCraft }),
    [items, useChance, selfCraft],
  );

  const columns: Column<CraftResult>[] = [
    {
      key: 'out',
      header: 'Крафт',
      sortVal: (r) => r.out,
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="truncate">{r.out}</span>
          <Badge>ур.{r.lvl}</Badge>
          {r.outUnknown && <Badge tone="amber">нет цены</Badge>}
        </span>
      ),
    },
    { key: 'cost', header: 'Себест.', align: 'right', sortVal: (r) => r.cost, render: (r) => money(r.cost) },
    {
      key: 'revenue',
      header: 'Выручка',
      align: 'right',
      sortVal: (r) => r.revenue ?? -Infinity,
      render: (r) => money(r.revenue),
    },
    {
      key: 'profit',
      header: 'Профит',
      align: 'right',
      sortVal: (r) => r.profit ?? -Infinity,
      render: (r) =>
        r.profit == null ? '—' : (
          <span className={`font-semibold ${r.profit >= 0 ? 'text-green' : 'text-red'}`}>
            {money(r.profit)}
          </span>
        ),
    },
    {
      key: 'roi',
      header: 'ROI',
      align: 'right',
      sortVal: (r) => r.roi ?? -Infinity,
      render: (r) => (r.roi == null ? '—' : `${r.roi.toFixed(0)}%`),
    },
    {
      key: 'perHour',
      header: 'В час',
      align: 'right',
      sortVal: (r) => r.perHour ?? -Infinity,
      render: (r) => money(r.perHour),
    },
    {
      key: 'bottleneck',
      header: 'Лимит',
      sortVal: (r) => r.bottleneck,
      render: (r) => <Badge tone={r.bottleneck === 'спрос' ? 'amber' : 'default'}>{r.bottleneck}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <Toggle checked={useChance} onChange={setUseChance} label="Учитывать шанс крафта" />
        <Toggle checked={selfCraft} onChange={setSelfCraft} label="Крафтить ингредиенты самому" />
      </div>
      <Card>
        <DataTable
          columns={columns}
          data={data}
          defaultSort={{ key: 'perHour', dir: -1 }}
          rowKey={(r) => r.out}
          empty="Импортируй раздел «Предметы» — появятся расчёты крафта."
          renderExpanded={(r) => <IngredientBreakdown recipe={r} />}
        />
      </Card>
    </div>
  );
}

function IngredientBreakdown({ recipe }: { recipe: CraftResult }) {
  return (
    <div className="text-xs">
      <div className="mb-2 text-muted">
        Ингредиенты на 1 крафт (выход ~{recipe.outQty} шт, шанс с {recipe.chBase}%):
      </div>
      <table className="w-full">
        <tbody>
          {recipe.ingDetail.map((ing) => (
            <tr key={ing.n} className="border-b border-line/30">
              <td className="py-1 pr-2">
                {ing.n} <span className="text-muted">×{ing.q}</span>
              </td>
              <td className="py-1 pr-2">
                {ing.via === 'craft' && <Badge tone="accent">крафт</Badge>}
                {ing.via === 'market' && <Badge>рынок</Badge>}
                {ing.via === 'none' && <Badge tone="amber">нет цены</Badge>}
              </td>
              <td className="py-1 pr-2 text-right tabular-nums text-muted">
                {ing.unit != null ? money(ing.unit) : '—'}/шт
              </td>
              <td className="py-1 text-right font-medium tabular-nums">
                {ing.line != null ? money(ing.line) : '—'}
              </td>
            </tr>
          ))}
          <tr>
            <td className="pt-2 text-muted" colSpan={3}>
              Ингредиенты + {money(recipe.money)} за крафт
            </td>
            <td className="pt-2 text-right font-semibold tabular-nums">= {money(recipe.cost)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[var(--color-accent)]" />
      <span className="text-muted">{label}</span>
    </label>
  );
}
