'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  computeFarm,
  computeFlip,
  computeKitchen,
  computeRecipes,
  money,
  nf,
  sellAdvice,
  type MarketRow,
} from '@kupec/core';
import { rowKey, useStore } from '../../lib/store';
import { Badge, Card, DataTable, FavStar, type Column } from '../ui';
import { PATH_LABEL } from '../../lib/labels';

/** Перейти на другую вкладку (слушает AppShell). */
function goTab(key: string) {
  window.dispatchEvent(new CustomEvent('kupec:navtab', { detail: key }));
}

/** Колонки рынка; star-колонка добавляется отдельно (нужен доступ к стору). */
export const marketColumns: Column<MarketRow>[] = [
  {
    key: 'name',
    header: 'Товар',
    sortVal: (r) => r.name,
    render: (r) => (
      <span className="flex items-center gap-2">
        <span className="truncate">{r.name}</span>
        <Badge>{PATH_LABEL[r._path ?? ''] ?? r._path}</Badge>
      </span>
    ),
  },
  {
    key: 'advice',
    header: 'Продавать ~',
    align: 'right',
    sortVal: (r) => r.avg ?? 0,
    render: (r) => {
      const a = sellAdvice(r.avg, r.min, r.max);
      if (!a) return '—';
      return (
        <span
          className="cursor-help border-b border-dotted border-muted/50"
          title={`Быстро продать: ${money(a.fast)}\nСправедливо (средняя): ${money(a.fair)}\nПотолок рынка: ${money(a.top)}`}
        >
          {money(a.fair)}
        </span>
      );
    },
  },
  { key: 'sold', header: 'Продано', align: 'right', sortVal: (r) => r.sold ?? 0, render: (r) => nf(r.sold) },
  {
    key: 'perDay',
    header: 'В день',
    align: 'right',
    sortVal: (r) => r.perDay ?? 0,
    render: (r) => (r.perDay != null ? r.perDay.toFixed(1) : '—'),
  },
  {
    key: 'turnover',
    header: 'Оборот',
    align: 'right',
    sortVal: (r) => r.turnover ?? 0,
    render: (r) => money(r.turnover),
  },
];

/** Star-колонка, привязанная к избранному стора. */
export function useFavColumn(): Column<MarketRow> {
  const { isFav, toggleFav } = useStore();
  return {
    key: 'fav',
    header: '',
    render: (r) => {
      const k = rowKey(r);
      return <FavStar active={isFav(k)} onClick={() => toggleFav(k)} />;
    },
  };
}

export function OverviewTab() {
  const { rows, items } = useStore();
  const favCol = useFavColumn();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return ql ? rows.filter((r) => r.name.toLowerCase().includes(ql)) : rows;
  }, [rows, q]);

  // Бюджет: не советовать Bugatti за $20M тому, у кого $50k. 0 = без ограничения.
  const [budget, setBudget] = useState('');
  const cap = Number(budget) || Infinity;

  // Лучшее действие в каждом способе заработка — из тех же движков, что и вкладки.
  // Отбираем то, что по карману: перекуп по цене покупки, крафт/кухня по себестоимости.
  const flip = useMemo(
    () =>
      computeFlip(rows)
        .filter((f) => f.deal <= cap)
        .sort((a, b) => b.score - a.score)[0],
    [rows, cap],
  );
  const craft = useMemo(
    () =>
      computeRecipes(items, { useChance: true, selfCraft: true })
        .filter((r) => (r.weekly ?? 0) > 0 && r.ch[1] >= 30 && r.cost <= cap)
        .sort((a, b) => (b.weekly ?? 0) - (a.weekly ?? 0))[0],
    [items, cap],
  );
  const dish = useMemo(
    () =>
      computeKitchen(items)
        .filter((r) => r.perHour != null && r.perHour > 0 && r.ingCost <= cap)
        .sort((a, b) => (b.perHour ?? 0) - (a.perHour ?? 0))[0],
    [items, cap],
  );
  // Фарм — без вложений, бюджет не ограничивает.
  const farm = useMemo(() => computeFarm(rows)[0], [rows]);

  const searching = q.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Поиск товара… (напр. что почём продать или материал для дома)"
        className="w-full max-w-md rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent"
      />

      {!searching && (flip || craft || dish || farm) && (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-sm font-semibold">💡 С чего начать зарабатывать</span>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              мой бюджет
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="любой"
                className="w-28 rounded-md border border-line bg-surface px-2 py-1 text-right text-xs tabular-nums outline-none focus:border-accent"
              />
            </label>
            {cap !== Infinity && (
              <span className="text-xs text-muted">— советуем то, что по карману</span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {flip && (
              <ActionCard
                icon="💱"
                title="Перекуп"
                item={flip.name}
                profit={`+${money(flip.profit)}`}
                sub="навар со штуки"
                lines={[
                  `Купи ≤ ${money(flip.deal)}`,
                  `Продай ~ ${money(flip.sell)}`,
                  `Спрос ${flip.perDay.toFixed(0)}/день`,
                ]}
                onOpen={() => goTab('flip')}
              />
            )}
            {craft && (
              <ActionCard
                icon="🔨"
                title="Крафт"
                item={craft.out}
                profit={money(craft.perHour)}
                sub="профит в час"
                lines={[
                  `Профит ${money(craft.profit)}/крафт`,
                  `Себест. ${money(craft.cost)}`,
                  `Шанс ${craft.ch[0]}–${craft.ch[1]}%`,
                ]}
                onOpen={() => goTab('workshop')}
              />
            )}
            {dish && (
              <ActionCard
                icon="🍳"
                title="Кухня"
                item={dish.name}
                profit={money(dish.perHour)}
                sub="профит в час"
                lines={[
                  `Профит ${money(dish.profit)} за партию`,
                  `Ингредиенты ${money(dish.ingCost)}`,
                  dish.perDay != null ? `Спрос ${dish.perDay.toFixed(0)}/день` : 'блюдо',
                ]}
                onOpen={() => goTab('kitchen')}
              />
            )}
            {farm && (
              <ActionCard
                icon="🌾"
                title="Фарм"
                item={farm.name}
                profit={money(farm.avg)}
                sub="цена продажи"
                lines={[
                  farm.farmCat,
                  `Продаётся ${farm.perDay != null ? farm.perDay.toFixed(0) : '—'}/день`,
                  'сырьё — собирай и продавай',
                ]}
                onOpen={() => goTab('farm')}
              />
            )}
          </div>
        </div>
      )}

      <div>
        {!searching && (
          <div className="mb-2 text-sm font-semibold">
            📊 Самое ходовое на рынке <span className="font-normal text-muted">(по обороту — что реально покупают)</span>
          </div>
        )}
        <Card>
          <DataTable
            columns={[favCol, ...marketColumns]}
            data={filtered}
            defaultSort={{ key: 'turnover', dir: -1 }}
            rowKey={(r) => rowKey(r)}
            empty={q ? 'Ничего не найдено.' : 'Загрузи данные — кнопка «С сервера» или «Импорт».'}
          />
        </Card>
      </div>
    </div>
  );
}

/** Карточка «действие → навар» с кнопкой на нужную вкладку. */
function ActionCard({
  icon,
  title,
  item,
  profit,
  sub,
  lines,
  onOpen,
}: {
  icon: string;
  title: string;
  item: string;
  profit: string;
  sub: string;
  lines: ReactNode[];
  onOpen: () => void;
}) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-center gap-1.5">
        <span>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</span>
      </div>
      <div className="mt-1 truncate text-base font-bold" title={item}>
        {item}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-black text-green">{profit}</span>
        <span className="text-[11px] text-muted">{sub}</span>
      </div>
      <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted">
        {lines.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <button
        onClick={onOpen}
        className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-surface-2 hover:text-txt"
      >
        Открыть →
      </button>
    </Card>
  );
}
