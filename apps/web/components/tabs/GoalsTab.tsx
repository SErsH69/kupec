'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { computeGoal, money, type GoalItemResult } from '@kupec/core';
import { useStore } from '../../lib/store';
import { Badge, Card, StatCard } from '../ui';

/**
 * Цели: «прокачать дом», «собрать на тачку» — что нужно, сколько уже есть,
 * где брать дешевле (рынок или крафт) и сколько осталось вложить.
 */
export function GoalsTab() {
  const { goals, rows, items, addGoal, renameGoal, removeGoal, setGoalItem, removeGoalItem } =
    useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);

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
          onClick={() => setNewOpen(true)}
          className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Новый проект
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
            onClick={() => setNewOpen(true)}
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Создать проект
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
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-2xl shadow-black/50"
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
