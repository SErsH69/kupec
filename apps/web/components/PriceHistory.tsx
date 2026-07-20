'use client';

import { useEffect, useState } from 'react';
import { money, type MarketRow } from '@kupec/core';
import type { HistoryPoint } from '@kupec/client';
import { useAuth } from '../lib/auth';
import { useStore } from '../lib/store';

/**
 * График цены по нашим снимкам. Публичный API отдаёт только окно 30 дней,
 * поэтому это единственное место, где видно, что было раньше — ряд растёт
 * с каждым обновлением рынка.
 */
export function PriceHistory({ row }: { row: MarketRow }) {
  const { api } = useAuth();
  const { server } = useStore();
  const [points, setPoints] = useState<HistoryPoint[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setPoints(null);
    setError(false);
    api
      .getHistory(server, String(row._path ?? 'items'), String(row.id))
      .then((r) => alive && setPoints(r.points))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [api, server, row._path, row.id]);

  if (error) return <Note>Сервер истории недоступен</Note>;
  if (points == null) return <Note>Загружаю…</Note>;

  const vals = points.map((p) => p.avg).filter((v): v is number => v != null && v > 0);
  if (vals.length < 2) {
    return (
      <Note>
        Пока {vals.length === 0 ? 'нет' : 'одна'} точка. История копится с каждым обновлением
        рынка — вернись через пару дней.
      </Note>
    );
  }

  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const W = 300;
  const H = 56;
  const step = vals.length > 1 ? W / (vals.length - 1) : W;
  const path = vals
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(H - ((v - lo) / span) * H).toFixed(1)}`)
    .join(' ');

  const first = vals[0]!;
  const last = vals[vals.length - 1]!;
  const change = ((last - first) / first) * 100;
  const up = change >= 0;
  const days = spanDays(points);

  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-14 w-full">
        <path
          d={path}
          fill="none"
          stroke={up ? 'var(--color-green)' : 'var(--color-red)'}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex flex-wrap justify-between gap-2 text-[11px] text-muted">
        <span>
          {money(lo)} – {money(hi)}
        </span>
        <span className={up ? 'text-green' : 'text-red'}>
          {up ? '▲' : '▼'}
          {Math.abs(change).toFixed(1)}% за {days}
        </span>
      </div>
    </div>
  );
}

/** Человеческая длина ряда: «3 дня», «12 часов». */
function spanDays(points: HistoryPoint[]): string {
  const a = new Date(points[0]!.at).getTime();
  const b = new Date(points[points.length - 1]!.at).getTime();
  const hours = Math.max(0, (b - a) / 3_600_000);
  if (hours < 48) return `${Math.round(hours)} ч`;
  return `${Math.round(hours / 24)} дн`;
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 text-[11px] text-muted">{children}</div>;
}
