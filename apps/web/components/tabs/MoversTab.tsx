'use client';

import { useMemo } from 'react';
import { computeMovers, money, type MarketRow, type Mover } from '@kupec/core';
import { useStore } from '../../lib/store';
import { Card } from '../ui';

function nameMap(rows: MarketRow[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const r of rows) m[`${r._path ?? ''}:${r.id}`] = r.name;
  return m;
}

function MoverList({ title, movers, names }: { title: string; movers: Mover[]; names: Record<string, string> }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-muted">{title}</h3>
      {movers.length === 0 ? (
        <div className="text-sm text-muted">Пусто</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {movers.map((m) => {
            const up = m.pct > 0;
            return (
              <li key={m.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{names[m.key] ?? m.key}</span>
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="text-muted">
                    {money(m.prev)} → {money(m.cur)}
                  </span>
                  <span className={`w-14 text-right font-semibold ${up ? 'text-green' : 'text-red'}`}>
                    {up ? '▲' : '▼'}
                    {Math.abs(m.pct).toFixed(0)}%
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function MoversTab() {
  const { rows, history } = useStore();
  const names = useMemo(() => nameMap(rows), [rows]);
  const { up, down } = useMemo(() => computeMovers(history), [history]);

  if (history.length < 2) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Нужно ≥2 снимка данных. История цен копится автоматически при каждом импорте — импортируй
        данные сегодня и ещё раз позже (в другой день). Сейчас снимков: {history.length}.
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MoverList title="📈 Подорожало" movers={up} names={names} />
      <MoverList title="📉 Подешевело" movers={down} names={names} />
    </div>
  );
}
