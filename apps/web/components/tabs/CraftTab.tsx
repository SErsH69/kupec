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

  // Топ-5 рецептов по недельному профиту (с учётом спроса) — как в прототипе.
  const picks = useMemo(
    () =>
      data
        .filter((r) => (r.weekly ?? 0) > 0 && (!useChance || r.ch[1] >= 30))
        .sort((a, b) => (b.weekly ?? 0) - (a.weekly ?? 0))
        .slice(0, 5),
    [data, useChance],
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

      {picks.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-semibold">
            🔥 Крафтить на этой неделе <span className="font-normal text-muted">(по недельному профиту с учётом спроса)</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {picks.map((r, i) => (
              <PickCard key={r.out} n={i + 1} r={r} />
            ))}
          </div>
        </div>
      )}

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

function PickCard({ n, r }: { n: number; r: CraftResult }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold">
          {n}. {r.out}
        </span>
        <Badge>ур.{r.lvl}</Badge>
        <span className="ml-auto text-[11px] text-muted">
          шанс {r.ch[0]}–{r.ch[1]}%
        </span>
      </div>
      <div className="mt-2 text-xs leading-relaxed">
        <div className="flex justify-between">
          <span className="text-muted">профит/нед</span>
          <span className="font-bold text-green">{money(r.weekly)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">профит/крафт</span>
          <span className="tabular-nums">{money(r.profit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">спрос</span>
          <span className="tabular-nums">{r.outSold == null ? '—' : `${r.outSold} шт/нед`}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">себест.</span>
          <span className="tabular-nums">{money(r.cost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">лимит</span>
          <Badge tone={r.bottleneck === 'спрос' ? 'amber' : 'default'}>{r.bottleneck}</Badge>
        </div>
      </div>
    </Card>
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
