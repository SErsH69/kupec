'use client';

import { useMemo, useState } from 'react';
import { computeFarm, money, nf, type FarmCategory, type FarmRow } from '@kupec/core';
import { useStore } from '../../lib/store';
import { Badge, Card, DataTable, type Column } from '../ui';

/** Занятия фарма с иконками — выбираешь то, что умеешь/можешь. */
const CATS: { cat: FarmCategory; icon: string }[] = [
  { cat: 'Рыба', icon: '🎣' },
  { cat: 'Мясо/охота', icon: '🏹' },
  { cat: 'Руда', icon: '⛏️' },
  { cat: 'Дерево', icon: '🪓' },
  { cat: 'Урожай', icon: '🌾' },
];

type SortKey = 'avg' | 'perDay' | 'turnover';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'avg', label: 'Цена/шт' },
  { key: 'perDay', label: 'Спрос' },
  { key: 'turnover', label: 'Оборот' },
];

export function FarmTab() {
  const { items } = useStore();
  const all = useMemo(() => computeFarm(items), [items]);
  const [cat, setCat] = useState<FarmCategory | null>(null);
  const [sort, setSort] = useState<SortKey>('avg');

  // Только занятия, по которым есть сырьё.
  const present = useMemo(() => CATS.filter((c) => all.some((r) => r.farmCat === c.cat)), [all]);

  const data = useMemo(() => {
    const list = cat ? all.filter((r) => r.farmCat === cat) : all;
    return [...list].sort((a, b) => (Number(b[sort]) || 0) - (Number(a[sort]) || 0));
  }, [all, cat, sort]);

  const columns: Column<FarmRow>[] = [
    {
      key: 'name',
      header: 'Сырьё',
      sortVal: (r) => r.name,
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="truncate">{r.name}</span>
          {!cat && <Badge tone="accent">{r.farmCat}</Badge>}
        </span>
      ),
    },
    { key: 'avg', header: 'Цена/шт', align: 'right', sortVal: (r) => r.avg ?? 0, render: (r) => money(r.avg) },
    {
      key: 'perDay',
      header: 'Спрос/день',
      align: 'right',
      sortVal: (r) => r.perDay ?? 0,
      render: (r) => (r.perDay != null ? r.perDay.toFixed(0) : '—'),
    },
    { key: 'sold', header: 'Продано', align: 'right', sortVal: (r) => r.sold ?? 0, render: (r) => nf(r.sold) },
    {
      key: 'turnover',
      header: 'Оборот',
      align: 'right',
      sortVal: (r) => r.turnover ?? 0,
      render: (r) => money(r.turnover),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-amber/30 bg-amber/5 p-3 text-xs leading-relaxed text-muted">
        Фарм не требует денег — только время. Выбери занятие, которое тебе доступно, и собирай то,
        что <b className="text-txt">дороже и хорошо продаётся</b>. <b className="text-txt">Скорости
        добычи</b> (сколько штук в час) в данных нет — она зависит от навыка и снаряжения, поэтому
        сравнивай по цене и спросу.
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCat(null)}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            cat === null ? 'bg-accent/15 font-semibold text-txt' : 'border border-line text-muted hover:bg-surface-2 hover:text-txt'
          }`}
        >
          Все
        </button>
        {present.map((c) => (
          <button
            key={c.cat}
            onClick={() => setCat(c.cat)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
              cat === c.cat ? 'bg-accent/15 font-semibold text-txt' : 'border border-line text-muted hover:bg-surface-2 hover:text-txt'
            }`}
          >
            <span>{c.icon}</span>
            {c.cat}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted">
          сортировать
          <div className="flex rounded-lg bg-bg p-0.5">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`rounded-md px-2.5 py-1 text-xs transition ${
                  sort === s.key ? 'bg-surface-2 font-semibold text-txt shadow-sm' : 'text-muted hover:text-txt'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={data}
          defaultSort={{ key: sort, dir: -1 }}
          rowKey={(r) => String(r.id)}
          empty="Импортируй раздел «Предметы» — появится сырьё для фарма."
        />
      </Card>
    </div>
  );
}
