'use client';

import { useMemo, useState } from 'react';
import { money, sellAdvice, targetHit, trendFor, trendMap, type MarketRow, type TargetType } from '@kupec/core';
import { rowKey, useStore } from '../../lib/store';
import { Badge, Card } from '../ui';
import { PriceHistory } from '../PriceHistory';
import { PATH_LABEL } from '../../lib/labels';

export function FavTab() {
  const { favRows, history, getTarget } = useStore();
  const trends = useMemo(() => trendMap(history), [history]);

  if (favRows.length === 0) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <div className="text-4xl">🔖</div>
        <h2 className="mt-3 text-lg font-semibold">Избранное пусто</h2>
        <p className="mt-1 text-sm text-muted">
          Отметь звёздочкой ★ товары в любой вкладке (свои товары на продажу, материалы для
          прокачки дома) и задай ценовую цель — тут увидишь, когда рынок её достиг.
        </p>
      </Card>
    );
  }

  // достигшие цели — наверх
  const hit = (r: MarketRow): boolean => {
    const t = getTarget(rowKey(r));
    return !!t && targetHit(r, t);
  };
  const sorted = [...favRows].sort((a, b) => Number(hit(b)) - Number(hit(a)));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sorted.map((r) => (
        <FavCard key={rowKey(r)} row={r} trend={trendFor(trends, r)} />
      ))}
    </div>
  );
}

function FavCard({ row, trend }: { row: MarketRow; trend: number | null }) {
  const { getTarget, setTarget, toggleFav } = useStore();
  const key = rowKey(row);
  const target = getTarget(key);
  const hit = target ? targetHit(row, target) : false;
  const advice = sellAdvice(row.avg, row.min, row.max);

  // Тип цели — локальный стейт, чтобы выбор «купить/продать» не терялся до ввода цены.
  const [type, setType] = useState<TargetType>(target?.type ?? 'buy');
  const [chart, setChart] = useState(false);
  const setPrice = (price: number) => setTarget(key, price > 0 ? { price, type } : null);
  const pickType = (t: TargetType) => {
    setType(t);
    if (target && target.price > 0) setTarget(key, { price: target.price, type: t });
  };

  return (
    <Card className={`p-4 ${hit ? 'border-green ring-1 ring-green/40' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button onClick={() => toggleFav(key)} title="Убрать из избранного" className="text-amber">
              ★
            </button>
            <span className="truncate font-medium">{row.name}</span>
            <Badge>{PATH_LABEL[row._path ?? ''] ?? row._path}</Badge>
          </div>
          <div className="mt-1 text-xs text-muted">
            {money(row.min)} – {money(row.max)}
            {advice && <> · продавать ~{money(advice.fair)}</>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums">{money(row.avg)}</div>
          <TrendBadge t={trend} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/50 pt-3">
        <div className="flex rounded-lg bg-bg p-0.5 text-xs">
          <button
            onClick={() => pickType('buy')}
            className={`rounded-md px-2 py-1 ${type === 'buy' ? 'bg-surface-2 font-medium text-txt' : 'text-muted'}`}
          >
            купить ≤
          </button>
          <button
            onClick={() => pickType('sell')}
            className={`rounded-md px-2 py-1 ${type === 'sell' ? 'bg-surface-2 font-medium text-txt' : 'text-muted'}`}
          >
            продать ≥
          </button>
        </div>
        <input
          type="number"
          value={target?.price ?? ''}
          onChange={(e) => setPrice(Number(e.target.value) || 0)}
          placeholder="цена цели"
          className="w-28 rounded-lg border border-line bg-bg px-2 py-1 text-sm outline-none focus:border-accent"
        />
        {target && (
          <button onClick={() => setTarget(key, null)} className="text-xs text-muted hover:text-red">
            ✕
          </button>
        )}
        {hit ? (
          <Badge tone="green">🎯 цель достигнута</Badge>
        ) : target ? (
          <span className="text-xs text-muted">ждём…</span>
        ) : null}
        <button
          onClick={() => setChart((v) => !v)}
          title="История цены по нашим снимкам"
          className="ml-auto text-xs text-muted hover:text-txt"
        >
          📈 {chart ? 'скрыть' : 'история'}
        </button>
      </div>

      {chart && <PriceHistory row={row} />}
    </Card>
  );
}

function TrendBadge({ t }: { t: number | null }) {
  if (t == null || Math.abs(t) < 0.5) return <span className="text-xs text-muted">→ стабильно</span>;
  const up = t > 0;
  return (
    <span className={`text-xs font-medium ${up ? 'text-green' : 'text-red'}`}>
      {up ? '▲' : '▼'}
      {Math.abs(t).toFixed(0)}%
    </span>
  );
}
