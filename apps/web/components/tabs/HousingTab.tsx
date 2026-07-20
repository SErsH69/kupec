'use client';

import { useMemo, useState } from 'react';
import { money, type MarketRow } from '@kupec/core';
import { useStore } from '../../lib/store';
import { Badge, Card, DataTable, StatCard, type Column } from '../ui';

type Kind = 'houses' | 'apartments';

/**
 * Дома и квартиры: что реально продавалось на маркете за 30 дней и по какой цене.
 * Публичный API даёт только статистику перепродажи (продано/средняя/мин/макс) —
 * гос-цены, роялти и оплаты за день в нём нет.
 */
export function HousingTab() {
  const { rows } = useStore();
  const [kind, setKind] = useState<Kind>('houses');
  const [budget, setBudget] = useState('');
  const [minSold, setMinSold] = useState('1');

  const all = useMemo(() => rows.filter((r) => r._path === kind), [rows, kind]);

  const data = useMemo(() => {
    const cap = Number(budget) || Infinity;
    const need = Number(minSold) || 0;
    return all.filter((r) => (r.sold || 0) >= need && (r.min ?? Infinity) <= cap);
  }, [all, budget, minSold]);

  const stats = useMemo(() => {
    const traded = all.filter((r) => (r.sold || 0) > 0);
    const deals = traded.reduce((s, r) => s + (r.sold || 0), 0);
    const cheapest = [...traded].sort((a, b) => (a.min ?? Infinity) - (b.min ?? Infinity))[0];
    const dearest = [...traded].sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0];
    return { traded: traded.length, deals, cheapest, dearest };
  }, [all]);

  const noun = kind === 'houses' ? 'домов' : 'квартир';

  const columns: Column<MarketRow>[] = [
    { key: 'name', header: kind === 'houses' ? 'Дом' : 'Квартира', sortVal: (r) => r.name, render: (r) => r.name },
    {
      key: 'sold',
      header: 'Продано за 30д',
      align: 'right',
      sortVal: (r) => r.sold ?? 0,
      render: (r) => (
        <span className="flex items-center justify-end gap-1.5">
          {(r.sold || 0) >= 5 && <Badge tone="green">ходовой</Badge>}
          {r.sold ?? 0}
        </span>
      ),
    },
    { key: 'min', header: 'Дешевле всего', align: 'right', sortVal: (r) => r.min ?? Infinity, render: (r) => money(r.min) },
    {
      key: 'avg',
      header: 'Средняя',
      align: 'right',
      sortVal: (r) => r.avg ?? -Infinity,
      render: (r) => <span className="font-semibold">{money(r.avg)}</span>,
    },
    { key: 'max', header: 'Дороже всего', align: 'right', sortVal: (r) => r.max ?? -Infinity, render: (r) => money(r.max) },
    {
      key: 'spread',
      header: 'Разброс',
      align: 'right',
      sortVal: (r) => r.spreadPct ?? -Infinity,
      render: (r) => (r.spreadPct == null ? '—' : `${r.spreadPct.toFixed(0)}%`),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-xl bg-bg p-1">
          <Switch active={kind === 'houses'} onClick={() => setKind('houses')} label="🏠 Дома" />
          <Switch active={kind === 'apartments'} onClick={() => setKind('apartments')} label="🏢 Квартиры" />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Бюджет</span>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="любой"
            className="w-40 rounded-lg border border-line bg-bg px-3 py-2 text-sm tabular-nums outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Мин. продаж</span>
          <input
            type="number"
            value={minSold}
            onChange={(e) => setMinSold(e.target.value)}
            className="w-28 rounded-lg border border-line bg-bg px-3 py-2 text-sm tabular-nums outline-none focus:border-accent"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={`Торговалось ${noun}`} value={stats.traded} hint="за 30 дней" />
        <StatCard label="Всего сделок" value={stats.deals} tone="accent" />
        <StatCard
          label="Самая низкая цена"
          value={money(stats.cheapest?.min ?? null)}
          hint={stats.cheapest?.name}
          tone="green"
        />
        <StatCard
          label="Самая дорогая"
          value={money(stats.dearest?.avg ?? null)}
          hint={stats.dearest?.name}
        />
      </div>

      <Card className="border-amber/30 bg-amber/5 p-4 text-sm">
        <div className="font-semibold text-amber">Что здесь есть, а чего нет</div>
        <p className="mt-1 text-muted">
          Публичный API отдаёт только <b>перепродажу между игроками</b>: сколько раз дом сменил хозяина
          за 30 дней и по какой цене. Гос-цены, роялти в коинах, оплаты за день, уровня гаража и
          кладовки в нём <b>нет</b> — эти цифры берутся из сторонних каталогов и сюда не подтянуть.
          Номер дома совпадает, так что сверяй по нему.
        </p>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          data={data}
          defaultSort={{ key: 'sold', dir: -1 }}
          rowKey={(r) => String(r.id)}
          empty={`Нет ${noun} под фильтр — загрузи данные кнопкой «🔄 С сервера» или ослабь условия.`}
        />
      </Card>
    </div>
  );
}

function Switch({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm transition ${
        active ? 'bg-surface-2 font-semibold text-txt' : 'text-muted hover:text-txt'
      }`}
    >
      {label}
    </button>
  );
}
