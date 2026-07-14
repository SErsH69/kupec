'use client';

import { Fragment, useMemo, useState, type ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-xl)] border border-line bg-surface ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'green' | 'red' | 'accent';
}) {
  const toneClass =
    tone === 'green'
      ? 'text-green'
      : tone === 'red'
        ? 'text-red'
        : tone === 'accent'
          ? 'text-accent-2'
          : 'text-txt';
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</div>
      {hint != null && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'green' | 'red' | 'amber' | 'accent';
}) {
  const map = {
    default: 'bg-surface-2 text-muted',
    green: 'bg-green/15 text-green',
    red: 'bg-red/15 text-red',
    amber: 'bg-amber/15 text-amber',
    accent: 'bg-accent/15 text-accent',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

/** Звезда «в избранное». */
export function FavStar({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="В избранное"
      className={active ? 'text-amber' : 'text-muted/40 hover:text-muted'}
    >
      {active ? '★' : '☆'}
    </button>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  /** Значение для сортировки. */
  sortVal?: (row: T) => number | string;
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  defaultSort,
  rowKey,
  empty = 'Нет данных',
  renderExpanded,
}: {
  columns: Column<T>[];
  data: T[];
  defaultSort?: { key: string; dir: 1 | -1 };
  rowKey: (row: T, i: number) => string;
  empty?: ReactNode;
  /** Если задан — строки кликабельны и раскрывают деталь под собой. */
  renderExpanded?: (row: T) => ReactNode;
}) {
  const [sort, setSort] = useState(defaultSort ?? { key: columns[0]!.key, dir: -1 as 1 | -1 });
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortVal) return data;
    const sv = col.sortVal;
    return [...data].sort((a, b) => {
      const av = sv(a);
      const bv = sv(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sort.dir;
      return String(av).localeCompare(String(bv)) * sort.dir;
    });
  }, [data, sort, columns]);

  if (data.length === 0) {
    return <div className="p-8 text-center text-sm text-muted">{empty}</div>;
  }

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            {columns.map((c) => {
              const active = sort.key === c.key;
              return (
                <th
                  key={c.key}
                  onClick={() =>
                    c.sortVal &&
                    setSort((s) =>
                      s.key === c.key ? { key: c.key, dir: (-s.dir) as 1 | -1 } : { key: c.key, dir: -1 },
                    )
                  }
                  className={`sticky top-0 z-10 bg-surface px-3 py-2.5 font-medium ${
                    c.align === 'right' ? 'text-right' : ''
                  } ${c.sortVal ? 'cursor-pointer select-none hover:text-txt' : ''}`}
                >
                  {c.header}
                  {active && c.sortVal ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const k = rowKey(row, i);
            const isOpen = open.has(k);
            return (
              <Fragment key={k}>
                <tr
                  onClick={renderExpanded ? () => toggle(k) : undefined}
                  className={`border-b border-line/50 hover:bg-surface-2/50 ${renderExpanded ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((c, ci) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 tabular-nums ${c.align === 'right' ? 'text-right' : ''}`}
                    >
                      {renderExpanded && ci === 0 && (
                        <span className="mr-1 inline-block w-3 text-muted">{isOpen ? '▾' : '▸'}</span>
                      )}
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
                {renderExpanded && isOpen && (
                  <tr className="border-b border-line/50 bg-bg/40">
                    <td colSpan={columns.length} className="px-3 py-3">
                      {renderExpanded(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
