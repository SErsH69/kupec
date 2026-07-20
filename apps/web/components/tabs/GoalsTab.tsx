'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  computeGoal,
  findRealty,
  maxLevel,
  mergePlans,
  money,
  upgradePlan,
  UPGRADE_LABEL,
  type GoalItemResult,
  type UpgradeKind,
} from '@kupec/core';
import { useStore } from '../../lib/store';
import { Badge, Card, StatCard } from '../ui';

/**
 * Цели: «прокачать дом», «собрать на тачку» — что нужно, сколько уже есть,
 * где брать дешевле (рынок или крафт) и сколько осталось вложить.
 */
export function GoalsTab() {
  const { goals, rows, items, addGoal, addGoalWithItems, renameGoal, removeGoal, setGoalItem, removeGoalItem } =
    useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [houseOpen, setHouseOpen] = useState(false);

  // Держим выбранным существующий проект (после удаления — первый из оставшихся).
  useEffect(() => {
    if (goals.length === 0) setActiveId(null);
    else if (!goals.some((g) => g.id === activeId)) setActiveId(goals[0]!.id);
  }, [goals, activeId]);

  const goal = goals.find((g) => g.id === activeId) ?? null;
  const result = useMemo(() => (goal ? computeGoal(goal, rows) : null), [goal, rows]);

  const itemNames = useMemo(
    () => Array.from(new Set(items.map((i) => i.name).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru')),
    [items],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {goals.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveId(g.id)}
            className={`rounded-lg px-3.5 py-2 text-sm transition ${
              g.id === activeId
                ? 'bg-accent/15 font-semibold text-txt'
                : 'border border-line text-muted hover:bg-surface-2 hover:text-txt'
            }`}
          >
            {g.name}
          </button>
        ))}
        <button
          onClick={() => setHouseOpen(true)}
          className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          🏠 Прокачка дома
        </button>
        <button
          onClick={() => setNewOpen(true)}
          className="rounded-lg border border-line px-3.5 py-2 text-sm text-muted hover:bg-surface-2 hover:text-txt"
        >
          + Пустой проект
        </button>
      </div>

      {!goal || !result ? (
        <Card className="p-10 text-center">
          <div className="text-4xl">🎯</div>
          <h2 className="mt-3 text-lg font-semibold">Пока нет проектов</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Проект — это список материалов под конкретную задачу: прокачать дом, собрать на машину,
            закрыть уровень мастерской. Мы посчитаем, чего не хватает, где брать дешевле — на рынке
            или крафтом — и сколько ещё вложить.
          </p>
          <button
            onClick={() => setHouseOpen(true)}
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            🏠 Посчитать прокачку дома
          </button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Готово"
              value={`${Math.round(result.progress * 100)}%`}
              hint={`${result.totalHave} из ${result.totalNeed} шт`}
              tone={result.done ? 'green' : 'default'}
            />
            <StatCard
              label="Осталось вложить"
              value={money(result.remainingCost)}
              hint="по текущим ценам"
              tone="accent"
            />
            <StatCard
              label="По дну рынка"
              value={money(result.remainingMin)}
              hint="справочно — дно это разовые сделки"
              tone="green"
            />
            <StatCard label="Проект целиком" value={money(result.totalCost)} hint="всё количество" />
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-lg font-bold">{goal.name}</div>
                <div className="text-xs text-muted">
                  {goal.items.length} позиций
                  {result.unpriced > 0 && <> · {result.unpriced} без цены</>}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setAddItemOpen(true)}
                  className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  + Материал
                </button>
                <button
                  onClick={() => {
                    const n = prompt('Название проекта', goal.name);
                    if (n != null) renameGoal(goal.id, n);
                  }}
                  className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-txt"
                >
                  ✏️
                </button>
                <button
                  onClick={() => removeGoal(goal.id)}
                  className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-red/15 hover:text-red"
                >
                  Удалить
                </button>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg">
              <div
                className={`h-full rounded-full transition-all ${result.done ? 'bg-green' : 'bg-accent'}`}
                style={{ width: `${Math.round(result.progress * 100)}%` }}
              />
            </div>
          </Card>

          {goal.items.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted">
              Добавь материалы, которые нужны для проекта.
            </Card>
          ) : (
            <Card>
              <div className="overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-3 py-2.5 font-medium">Материал</th>
                      <th className="px-3 py-2.5 text-right font-medium">Нужно</th>
                      <th className="px-3 py-2.5 text-right font-medium">Есть</th>
                      <th className="px-3 py-2.5 text-right font-medium">Осталось</th>
                      <th className="px-3 py-2.5 font-medium">Где брать</th>
                      <th className="px-3 py-2.5 text-right font-medium">Цена/шт</th>
                      <th className="px-3 py-2.5 text-right font-medium">Остаток стоит</th>
                      <th className="px-3 py-2.5 text-right font-medium">~дней</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((it) => (
                      <ItemRow
                        key={it.name}
                        it={it}
                        onHave={(have) => setGoalItem(goal.id, { name: it.name, need: it.need, have })}
                        onNeed={(need) => setGoalItem(goal.id, { name: it.name, need, have: it.have })}
                        onRemove={() => removeGoalItem(goal.id, it.name)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {newOpen && (
        <NameModal
          title="Новый проект"
          placeholder="Напр. Прокачка дома"
          onClose={() => setNewOpen(false)}
          onSave={(n) => {
            addGoal(n);
            setNewOpen(false);
          }}
        />
      )}

      {houseOpen && (
        <HouseUpgradeModal
          onClose={() => setHouseOpen(false)}
          onCreate={(name, goalItems) => {
            addGoalWithItems(name, goalItems);
            setHouseOpen(false);
          }}
        />
      )}

      {addItemOpen && goal && (
        <AddItemModal
          items={itemNames}
          onClose={() => setAddItemOpen(false)}
          onSave={(item) => {
            setGoalItem(goal.id, item);
            setAddItemOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ItemRow({
  it,
  onHave,
  onNeed,
  onRemove,
}: {
  it: GoalItemResult;
  onHave: (v: number) => void;
  onNeed: (v: number) => void;
  onRemove: () => void;
}) {
  return (
    <tr className={`border-b border-line/50 ${it.done ? 'opacity-60' : ''}`}>
      <td className="px-3 py-2">
        <span className="flex items-center gap-2">
          {it.done && <span className="text-green">✓</span>}
          <span className="truncate">{it.name}</span>
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <NumInput value={it.need} onChange={onNeed} />
      </td>
      <td className="px-3 py-2 text-right">
        <NumInput value={it.have} onChange={onHave} />
      </td>
      <td className="px-3 py-2 text-right font-semibold tabular-nums">{it.left}</td>
      <td className="px-3 py-2">
        {it.via === 'craft' ? (
          <Badge tone="accent">крафт</Badge>
        ) : it.via === 'buy' ? (
          <Badge>рынок</Badge>
        ) : (
          <Badge tone="amber">нет цены</Badge>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {it.unit != null ? money(it.unit) : '—'}
        {it.craft != null && it.market != null && (
          <div className="text-[11px] text-muted">
            рынок {money(it.market)} · крафт {money(it.craft)}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right font-semibold tabular-nums">
        {it.lineCost != null ? money(it.lineCost) : '—'}
        {it.lineMin != null && it.lineCost != null && it.lineMin < it.lineCost && (
          <div className="text-[11px] text-green">дно {money(it.lineMin)}</div>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted">
        {it.daysToBuy == null ? '—' : it.daysToBuy < 1 ? '<1' : it.daysToBuy.toFixed(0)}
      </td>
      <td className="px-3 py-2 text-right">
        <button onClick={onRemove} className="text-muted hover:text-red">
          ✕
        </button>
      </td>
    </tr>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      className="w-20 rounded-md border border-line bg-bg px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-accent"
    />
  );
}

/* ---------------- прокачка дома ---------------- */

const KINDS: UpgradeKind[] = ['workshop', 'kitchen', 'pantry', 'garage'];

/**
 * Мастер: номер дома → характеристики из каталога → текущие и целевые уровни
 * разделов → таблица «что купить» и создание проекта одной кнопкой.
 */
function HouseUpgradeModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, items: { name: string; need: number; have: number }[]) => void;
}) {
  const [type, setType] = useState<'house' | 'apartment'>('house');
  const [num, setNum] = useState('');
  const [from, setFrom] = useState<Record<UpgradeKind, number>>({ workshop: 0, kitchen: 1, pantry: 1, garage: 1 });
  const [to, setTo] = useState<Record<UpgradeKind, number>>({ workshop: 0, kitchen: 1, pantry: 1, garage: 1 });

  const realty = useMemo(() => {
    const n = Number(num);
    return n > 0 ? findRealty(n, type) : undefined;
  }, [num, type]);

  // Квартира — только кухня и кладовка (гараж и мастерская только в доме).
  const kinds = type === 'apartment' ? (['kitchen', 'pantry'] as UpgradeKind[]) : KINDS;

  const plans = useMemo(
    () =>
      kinds
        .map((k) => upgradePlan(k, from[k], to[k], realty?.garageSlots))
        .filter((p) => p.steps.length > 0),
    [kinds, from, to, realty],
  );
  const total = useMemo(() => mergePlans(plans), [plans]);

  const create = () => {
    if (!total.materials.length) return;
    const label = realty ? `${type === 'house' ? 'Дом' : 'Квартира'} #${realty.num}` : 'Прокачка';
    onCreate(
      `${label} — прокачка`,
      total.materials.map((m) => ({ name: m.name, need: m.qty, have: 0 })),
    );
  };

  return (
    <Shell title="Прокачка дома" onClose={onClose} onSubmit={create} wide>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-1 rounded-xl bg-bg p-1">
            <button
              onClick={() => setType('house')}
              className={`rounded-lg px-4 py-2 text-sm ${type === 'house' ? 'bg-surface-2 font-semibold' : 'text-muted'}`}
            >
              🏠 Дом
            </button>
            <button
              onClick={() => setType('apartment')}
              className={`rounded-lg px-4 py-2 text-sm ${type === 'apartment' ? 'bg-surface-2 font-semibold' : 'text-muted'}`}
            >
              🏢 Квартира
            </button>
          </div>
          <Field label="Номер">
            <input
              type="number"
              value={num}
              onChange={(e) => setNum(e.target.value)}
              placeholder="напр. 352"
              className={`${inputCls} w-32`}
              autoFocus
            />
          </Field>
        </div>

        {num && !realty && (
          <div className="rounded-lg border border-amber/30 bg-amber/5 px-4 py-2.5 text-sm text-amber">
            Такого номера нет в каталоге.
          </div>
        )}

        {realty && (
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-bg/40 p-4 text-sm sm:grid-cols-4">
            <Info label="Гос-цена" value={money(realty.gosPrice)} />
            <Info label="Оплата за день" value={money(realty.rentPerDay)} />
            <Info
              label="Роялти"
              value={realty.royaltyCoins > 0 ? `${realty.royaltyCoins} коинов` : 'нет'}
              tone={realty.royaltyCoins > 0 ? 'amber' : 'green'}
            />
            <Info label="Гараж / кладовка" value={`${realty.garageSlots} мест · ${realty.storageKg} кг`} />
          </div>
        )}

        {realty && (
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Уровни: с какого на какой
            </div>
            {kinds.map((k) => {
              const max = maxLevel(k, realty.garageSlots);
              const min = k === 'workshop' ? 0 : 1;
              return (
                <div key={k} className="flex items-center gap-3 rounded-lg border border-line bg-bg/40 px-4 py-2.5">
                  <span className="w-28 shrink-0 text-sm">{UPGRADE_LABEL[k]}</span>
                  <LevelPick label="сейчас" min={min} max={max} value={from[k]} onChange={(v) => {
                    setFrom((p) => ({ ...p, [k]: v }));
                    setTo((p) => ({ ...p, [k]: Math.max(p[k], v) }));
                  }} />
                  <span className="text-muted">→</span>
                  <LevelPick label="цель" min={from[k]} max={max} value={to[k]} onChange={(v) => setTo((p) => ({ ...p, [k]: v }))} />
                </div>
              );
            })}
          </div>
        )}

        {plans.length > 0 && (
          <div>
            <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-sm font-semibold">Что нужно купить</span>
              <span className="text-sm text-muted">
                деньгами <b className="text-txt">{money(total.money)}</b> · время{' '}
                <b className="text-txt">{total.hours} ч</b>
              </span>
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border border-line">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {total.materials.map((m) => (
                    <tr key={m.name} className="border-b border-line/50 last:border-0">
                      <td className="px-3 py-2">{m.name}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{m.qty} шт</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-muted">
              Создам проект с этими материалами — в таблице будет видно, что дешевле купить, а что
              скрафтить, и сколько всего осталось вложить.
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone?: 'amber' | 'green' }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`font-semibold tabular-nums ${tone === 'amber' ? 'text-amber' : tone === 'green' ? 'text-green' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function LevelPick({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const opts = [];
  for (let i = min; i <= max; i++) opts.push(i);
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-line bg-bg px-2 py-1 text-sm text-txt outline-none focus:border-accent"
      >
        {opts.map((i) => (
          <option key={i} value={i}>
            {i === 0 ? 'нет' : i}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------------- диалоги ---------------- */

function NameModal({
  title,
  placeholder,
  onClose,
  onSave,
}: {
  title: string;
  placeholder: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <Shell title={title} onClose={onClose} onSubmit={() => name.trim() && onSave(name)}>
      <Field label="Название">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
          autoFocus
        />
      </Field>
    </Shell>
  );
}

function AddItemModal({
  items,
  onClose,
  onSave,
}: {
  items: string[];
  onClose: () => void;
  onSave: (item: { name: string; need: number; have: number }) => void;
}) {
  const [name, setName] = useState('');
  const [need, setNeed] = useState('');
  const [have, setHave] = useState('');

  const submit = () => {
    const n = Number(need) || 0;
    if (!name.trim() || n <= 0) return;
    onSave({ name: name.trim(), need: n, have: Number(have) || 0 });
  };

  return (
    <Shell title="Материал в проект" onClose={onClose} onSubmit={submit}>
      <div className="flex flex-col gap-4">
        <Field label="Материал">
          <input
            list="goal-items"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Начни вводить название…"
            className={inputCls}
            autoFocus
          />
          <datalist id="goal-items">
            {items.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Нужно" hint="всего для проекта">
            <input type="number" value={need} onChange={(e) => setNeed(e.target.value)} placeholder="шт" className={inputCls} />
          </Field>
          <Field label="Уже есть" hint="можно 0">
            <input type="number" value={have} onChange={(e) => setHave(e.target.value)} placeholder="0" className={inputCls} />
          </Field>
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  title,
  onClose,
  onSubmit,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-2xl shadow-black/50`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-7 py-5">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-lg leading-none text-muted hover:bg-surface-2 hover:text-txt">
            ✕
          </button>
        </div>
        <div className="px-7 py-6">{children}</div>
        <div className="flex justify-end gap-2 border-t border-line bg-bg/40 px-7 py-4">
          <button onClick={onClose} className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium hover:bg-surface-2">
            Отмена
          </button>
          <button onClick={onSubmit} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-[15px] tabular-nums outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  );
}
