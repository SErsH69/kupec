'use client';

import { useMemo, useState } from 'react';
import { buildRL, money, type RLVehicle } from '@kupec/core';
import { useStore } from '../../lib/store';
import { Card, DataTable, type Column } from '../ui';

interface RLRow extends RLVehicle {
  market: number | null;
  /** Навар «купить у государства → продать на рынке» = рынок − гос-цена. */
  profit: number | null;
}

export function RLTab() {
  const { rows } = useStore();
  const [onlyDeals, setOnlyDeals] = useState(false);

  const marketByCode = useMemo(() => {
    const m: Record<string, number | null> = {};
    for (const r of rows) {
      if (r._path === 'vehicles') m[String(r.id)] = r.avg;
    }
    return m;
  }, [rows]);

  const all = useMemo<RLRow[]>(
    () =>
      buildRL().map((v) => {
        const market = marketByCode[v.code] ?? null;
        const profit = market != null && v.gos != null ? market - v.gos : null;
        return { ...v, market, profit };
      }),
    [marketByCode],
  );

  const hasMarket = useMemo(() => rows.some((r) => r._path === 'vehicles'), [rows]);
  const dealCount = useMemo(() => all.filter((r) => (r.profit ?? 0) > 0).length, [all]);
  const data = useMemo(() => (onlyDeals ? all.filter((r) => (r.profit ?? 0) > 0) : all), [all, onlyDeals]);

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
    { key: 'gos', header: 'Гос-цена', align: 'right', sortVal: (r) => r.gos ?? 0, render: (r) => money(r.gos) },
    {
      key: 'market',
      header: 'Рынок ~',
      align: 'right',
      sortVal: (r) => r.market ?? -1,
      render: (r) => (r.market == null ? <span className="text-muted">—</span> : money(r.market)),
    },
    {
      key: 'profit',
      header: 'Навар',
      align: 'right',
      sortVal: (r) => r.profit ?? -Infinity,
      render: (r) =>
        r.profit == null ? (
          <span className="text-muted">—</span>
        ) : (
          <span className={`font-semibold ${r.profit > 0 ? 'text-green' : 'text-muted'}`}>
            {r.profit > 0 ? '+' : ''}
            {money(r.profit)}
          </span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-accent/30 bg-accent/5 p-3 text-xs leading-relaxed text-muted">
        Транспорт: <b className="text-txt">гос-цена</b> — сколько стоит купить авто у государства,{' '}
        <b className="text-txt">рынок</b> — за сколько его перепродают игроки.{' '}
        <b className="text-green">Навар = рынок − гос</b>: где выгодно скупать у государства и
        перепродавать. Нужен загруженный раздел «Транспорт».
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOnlyDeals((v) => !v)}
          disabled={!hasMarket}
          className={`rounded-lg px-3 py-1.5 text-sm transition disabled:opacity-40 ${
            onlyDeals ? 'bg-green/15 font-semibold text-green' : 'border border-line text-muted hover:bg-surface-2 hover:text-txt'
          }`}
        >
          💰 Только выгодные {dealCount > 0 && <span className="opacity-70">{dealCount}</span>}
        </button>
        <span className="text-sm text-muted">{data.length} авто</span>
      </div>

      {!hasMarket && (
        <div className="rounded-lg border border-amber/30 bg-amber/5 px-4 py-2.5 text-xs text-muted">
          Загрузи рынок (кнопка «С сервера» или «Импорт») — колонки «Рынок» и «Навар» появятся.
        </div>
      )}

      <Card>
        <DataTable
          columns={columns}
          data={data}
          defaultSort={{ key: hasMarket ? 'profit' : 'gos', dir: hasMarket ? -1 : 1 }}
          rowKey={(r) => r.code}
          empty="Нет данных по авто."
        />
      </Card>
    </div>
  );
}
