'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  craftMetrics,
  journalSummary,
  money,
  tradePnl,
  tradeStatus,
  type Trade,
  type TradeStatus,
} from '@kupec/core';
import { useJournal } from '../../lib/journal';
import { useStore } from '../../lib/store';
import { Badge, Card, StatCard } from '../ui';

type Kind = 'flip' | 'craft';

/** Сделка в журнале: в общем журнале приходит с автором. */
type JTrade = Trade & { author?: string };

/** Оформление статуса (логика — `tradeStatus` в @kupec/core). */
const STATUS_META: Record<
  TradeStatus,
  { border: string; bar: string; label: string; tone: 'amber' | 'green' | 'red' }
> = {
  attention: { border: 'border-l-red', bar: 'bg-red', label: '⚠️ заполни данные', tone: 'red' },
  active: { border: 'border-l-amber', bar: 'bg-amber', label: '🟡 в продаже', tone: 'amber' },
  done: { border: 'border-l-green', bar: 'bg-green', label: '✅ продано', tone: 'green' },
};

/** Порядок вывода: сначала то, что требует действия. */
const RANK: Record<TradeStatus, number> = { attention: 0, active: 1, done: 2 };

export function JournalTab() {
  const { trades, addTrade, updateTrade, closeTrade, deleteTrade, scope, setScope, group } =
    useJournal();
  const { items, server } = useStore();
  const [groupOpen, setGroupOpen] = useState(false);
  const [selling, setSelling] = useState<JTrade | null>(null);
  const [editing, setEditing] = useState<JTrade | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<TradeStatus | 'all'>('all');

  const summary = useMemo(() => journalSummary(trades), [trades]);

  const withStatus = useMemo(
    () => trades.map((t) => ({ t, st: tradeStatus(t) })),
    [trades],
  );
  const counts = useMemo(() => {
    const c = { all: withStatus.length, attention: 0, active: 0, done: 0 };
    for (const { st } of withStatus) c[st]++;
    return c;
  }, [withStatus]);
  const visible = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return withStatus
      .filter(
        ({ t, st }) =>
          (filter === 'all' || st === filter) && (!ql || t.item.toLowerCase().includes(ql)),
      )
      .sort((a, b) => RANK[a.st] - RANK[b.st] || b.t.createdAt - a.t.createdAt);
  }, [withStatus, q, filter]);

  const itemNames = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.name).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'ru'),
      ),
    [items],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Открыто позиций"
          value={summary.open}
          hint={`вложено ${money(summary.invested)}`}
        />
        <StatCard
          label="Сейчас в продаже"
          value={money(summary.listedValue)}
          hint={`${summary.listedUnits} шт по выставл.`}
          tone="accent"
        />
        <StatCard
          label="Реализовано"
          value={money(summary.realized)}
          hint={`ROI ${summary.roi.toFixed(0)}% по закрытым`}
          tone={summary.realized >= 0 ? 'green' : 'red'}
        />
        <StatCard label="Закрыто" value={summary.closed} />
        <StatCard label="Всего сделок" value={summary.open + summary.closed} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + Добавить сделку
        </button>

        {group && (
          <div className="flex gap-1 rounded-xl bg-bg p-1">
            <ScopeBtn active={scope === 'mine'} onClick={() => setScope('mine')} label="Мой журнал" />
            <ScopeBtn active={scope === 'group'} onClick={() => setScope('group')} label={`👥 ${group.name}`} />
          </div>
        )}

        <button
          onClick={() => setGroupOpen(true)}
          className="ml-auto rounded-lg border border-line px-3.5 py-2 text-sm text-muted hover:bg-surface-2 hover:text-txt"
        >
          {group ? '👥 Группа' : '👥 Создать группу'}
        </button>
      </div>

      {scope === 'group' && group && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 text-xs text-muted">
          Общий журнал группы «{group.name}» — сюда видят все участники. Править и удалять можно
          только свои сделки.
        </div>
      )}

      {addOpen && (
        <AddTradeModal
          onAdd={addTrade}
          items={itemNames}
          server={server}
          onClose={() => setAddOpen(false)}
        />
      )}

      {trades.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 Найти сделку по названию…"
            className="w-full max-w-xs rounded-lg border border-line bg-surface px-3.5 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="Все" count={counts.all} />
            <FilterChip active={filter === 'active'} onClick={() => setFilter('active')} label="🟡 В продаже" count={counts.active} tone="amber" />
            <FilterChip active={filter === 'done'} onClick={() => setFilter('done')} label="✅ Продано" count={counts.done} tone="green" />
            {counts.attention > 0 && (
              <FilterChip active={filter === 'attention'} onClick={() => setFilter('attention')} label="⚠️ Заполни" count={counts.attention} tone="red" />
            )}
          </div>
        </div>
      )}

      {trades.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">Журнал пуст. Добавь сделку выше.</Card>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">Ничего не найдено — сбрось поиск или фильтр.</Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map(({ t, st }) => (
            <TradeCard
              key={t.id}
              t={t}
              st={st}
              onSell={() => setSelling(t)}
              onEdit={() => setEditing(t)}
              onDelete={() => deleteTrade(t.id)}
            />
          ))}
        </div>
      )}

      {selling && (
        <SellModal
          trade={selling}
          onClose={() => setSelling(null)}
          onCraft={(patch) => {
            updateTrade(selling.id, patch);
            setSelling(null);
          }}
          onFlip={(sell) => {
            closeTrade(selling.id, sell);
            setSelling(null);
          }}
        />
      )}

      {groupOpen && <GroupModal onClose={() => setGroupOpen(false)} />}

      {editing && (
        <FullEditModal
          trade={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateTrade(editing.id, patch);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TradeCard({
  t,
  st,
  onSell,
  onEdit,
  onDelete,
}: {
  t: JTrade;
  st: TradeStatus;
  onSell: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return t.kind === 'craft' ? (
    <CraftCard t={t} st={st} onSell={onSell} onEdit={onEdit} onDelete={onDelete} />
  ) : (
    <FlipCard t={t} st={st} onSell={onSell} onEdit={onEdit} onDelete={onDelete} />
  );
}

function ScopeBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3.5 py-1.5 text-sm transition ${
        active ? 'bg-surface-2 font-semibold text-txt' : 'text-muted hover:text-txt'
      }`}
    >
      {label}
    </button>
  );
}

/** Создание/вступление в группу и список участников. */
function GroupModal({ onClose }: { onClose: () => void }) {
  const { group, members, createGroup, joinGroup, leaveGroup } = useJournal();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вышло');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={group ? `Группа «${group.name}»` : 'Общий журнал'}
      subtitle={
        group
          ? 'Общий журнал для семьи или банды'
          : 'Один журнал на нескольких игроков: видно, кто что скрафтил и продал'
      }
      onClose={onClose}
    >
      {group ? (
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Код приглашения
            </div>
            <div className="mt-1 flex items-center gap-3">
              <code className="rounded-lg border border-line bg-bg px-4 py-2.5 text-xl font-bold tracking-widest">
                {group.inviteCode}
              </code>
              <span className="text-xs text-muted">Дай его тем, кого хочешь позвать</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Участники ({members.length})
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {members.map((m) => (
                <div key={m.id} className="rounded-lg border border-line bg-bg/40 px-3 py-2 text-sm">
                  {m.email}
                  {m.id === group.ownerId && <span className="ml-2 text-xs text-muted">владелец</span>}
                </div>
              ))}
            </div>
          </div>
          {error && <div className="text-sm text-red">{error}</div>}
          <button
            onClick={() => run(async () => { await leaveGroup(); onClose(); })}
            disabled={busy}
            className="self-start rounded-lg px-4 py-2 text-sm text-muted hover:bg-red/15 hover:text-red disabled:opacity-40"
          >
            Выйти из группы
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Field label="Создать свою">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Напр. Семья Ивановых"
                className={inputCls}
              />
            </Field>
            <button
              onClick={() => name.trim() && run(async () => { await createGroup(name); })}
              disabled={busy || !name.trim()}
              className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Создать
            </button>
          </div>

          <div className="border-t border-line pt-5">
            <Field label="Или вступить по коду">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className={`${inputCls} tracking-widest`}
              />
            </Field>
            <button
              onClick={() => code.trim() && run(async () => { await joinGroup(code); })}
              disabled={busy || !code.trim()}
              className="mt-2 self-start rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-2 disabled:opacity-40"
            >
              Вступить
            </button>
          </div>

          {error && <div className="text-sm text-red">{error}</div>}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- карточки ---------------- */

function CraftCard({
  t,
  st,
  onSell,
  onEdit,
  onDelete,
}: {
  t: JTrade;
  st: TradeStatus;
  onSell: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const m = craftMetrics(t);
  const meta = STATUS_META[st];
  const date = new Date(t.createdAt).toLocaleDateString('ru-RU');
  const pct = m.crafted > 0 ? Math.round((m.soldUnits / m.crafted) * 100) : 0;
  const noPrice = m.listPrice == null || m.listPrice <= 0;
  return (
    <Card className={`border-l-4 p-4 ${meta.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold">{t.item}</span>
            <Badge tone="amber">🔨 крафт</Badge>
            {t.author && <Badge>{t.author}</Badge>}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span className="text-xs text-muted">{date}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-lg font-bold tabular-nums ${m.realized >= 0 ? 'text-green' : 'text-red'}`}>
            {m.realized > 0 ? '+' : ''}
            {money(m.realized)}
          </div>
          <div className="text-xs text-muted">
            {m.roi != null ? `ROI ${m.roi.toFixed(0)}%` : 'ещё не продано'}
          </div>
        </div>
      </div>

      {/* Ключевые цифры крупно */}
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-bg/50 p-3">
        <BigStat label="Материалы" value={money(m.materials)} />
        <BigStat label="Себест/шт" value={money(m.costPerUnit)} />
        <BigStat label="Выставл/шт" value={noPrice ? 'нет' : money(m.listPrice!)} warn={noPrice} />
      </div>

      {/* Прогресс продажи */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">
            Продано {m.soldUnits}/{m.crafted} шт
          </span>
          <span className="tabular-nums text-muted">выручка {money(m.soldRevenue)}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg">
          <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <CardActions open={m.open} onSell={onSell} onEdit={onEdit} onDelete={onDelete} />
    </Card>
  );
}

function FlipCard({
  t,
  st,
  onSell,
  onEdit,
  onDelete,
}: {
  t: JTrade;
  st: TradeStatus;
  onSell: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const p = tradePnl(t);
  const meta = STATUS_META[st];
  const date = new Date(t.createdAt).toLocaleDateString('ru-RU');
  return (
    <Card className={`border-l-4 p-4 ${meta.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold">{t.item}</span>
            <Badge>💱 перекуп</Badge>
            {t.author && <Badge>{t.author}</Badge>}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span className="text-xs text-muted">{date}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {p.pnl == null ? (
            <div className="text-sm text-muted">в рынке</div>
          ) : (
            <>
              <div className={`text-lg font-bold tabular-nums ${p.pnl >= 0 ? 'text-green' : 'text-red'}`}>
                {p.pnl > 0 ? '+' : ''}
                {money(p.pnl)}
              </div>
              <div className="text-xs text-muted">ROI {p.roi!.toFixed(0)}%</div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-bg/50 p-3">
        <BigStat label="Кол-во" value={`${t.qty} шт`} />
        <BigStat label="Куплено/шт" value={money(t.buy)} />
        <BigStat label="Продано/шт" value={t.sell != null ? money(t.sell) : '—'} />
      </div>

      <CardActions open={p.open} onSell={onSell} onEdit={onEdit} onDelete={onDelete} />
    </Card>
  );
}

/** Крупная цифра в карточке (материалы/себестоимость и т.п.). */
function BigStat({ label, value, warn }: { label: string; value: ReactNode; warn?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`truncate text-sm font-bold tabular-nums ${warn ? 'text-red' : 'text-txt'}`} title={String(value)}>
        {value}
      </div>
    </div>
  );
}

/** Кнопки под карточкой сделки. */
function CardActions({
  open,
  onSell,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onSell: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-3 flex gap-2 border-t border-line/50 pt-3">
      {open && (
        <button onClick={onSell} className="rounded-md bg-green/15 px-2.5 py-1 text-xs font-medium text-green hover:bg-green/25">
          Продать
        </button>
      )}
      <button onClick={onEdit} className="rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-txt">
        ✏️ Правка
      </button>
      <button onClick={onDelete} className="rounded-md px-2.5 py-1 text-xs text-muted hover:bg-red/15 hover:text-red">
        Удалить
      </button>
    </div>
  );
}

/** Чип фильтра по статусу с числом сделок. */
function FilterChip({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: 'amber' | 'green' | 'red';
}) {
  const activeCls =
    tone === 'green'
      ? 'bg-green/15 text-green'
      : tone === 'red'
        ? 'bg-red/15 text-red'
        : tone === 'amber'
          ? 'bg-amber/15 text-amber'
          : 'bg-accent/15 text-txt';
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        active ? `${activeCls} font-semibold` : 'border border-line text-muted hover:bg-surface-2 hover:text-txt'
      }`}
    >
      {label} <span className="opacity-60">{count}</span>
    </button>
  );
}

/* ---------------- форма добавления ---------------- */

function AddTradeModal({
  onAdd,
  items,
  server,
  onClose,
}: {
  onAdd: (t: import('../../lib/api').TradeInput) => void;
  items: string[];
  server: string;
  onClose: () => void;
}) {
  // По умолчанию — крафт: основной сценарий (дом/производство).
  const [kind, setKind] = useState<Kind>('craft');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('');
  const [buy, setBuy] = useState('');
  const [materials, setMaterials] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [sold, setSold] = useState('');

  const submit = () => {
    const q = Number(qty) || 0;
    if (!item.trim() || q <= 0) return;
    if (kind === 'flip') {
      const b = Number(buy) || 0;
      if (b <= 0) return;
      onAdd({ item: item.trim(), qty: q, buy: b, server });
    } else {
      const mat = Number(materials) || 0;
      if (mat <= 0) return;
      const lp = Number(listPrice) || 0;
      const su = Math.min(Number(sold) || 0, q);
      onAdd({
        item: item.trim(),
        qty: q,
        buy: mat / q,
        kind: 'craft',
        materials: mat,
        listPrice: lp || null,
        soldUnits: su || null,
        soldRevenue: lp && su ? lp * su : null,
        server,
      });
    }
    onClose();
  };

  return (
    <Modal
      title="Новая сделка"
      subtitle={kind === 'craft' ? 'Скрафтил и выставил на продажу' : 'Купил дешевле — продам дороже'}
      onClose={onClose}
      footer={<ModalActions onCancel={onClose} onSubmit={submit} submitLabel="Добавить" />}
    >
      <KindSwitch kind={kind} onChange={setKind} />

      <div className="mt-5 flex flex-col gap-4">
        <Field label="Товар">
          <input
            list="journal-items"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Начни вводить название…"
            className={inputCls}
            autoFocus
          />
          <datalist id="journal-items">
            {items.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>

        {kind === 'flip' ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Кол-во">
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="шт" className={inputCls} />
            </Field>
            <Field label="Цена покупки" hint="за штуку">
              <input type="number" value={buy} onChange={(e) => setBuy(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Скрафчено" hint="сколько штук вышло">
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="шт" className={inputCls} />
            </Field>
            <Field label="Материалы" hint="суммарно потрачено">
              <input type="number" value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
            <Field label="Выставл/шт" hint="цена на маркете">
              <input type="number" value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
            <Field label="Продано" hint="уже ушло, можно 0">
              <input type="number" value={sold} onChange={(e) => setSold(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Переключатель типа сделки. */
function KindSwitch({ kind, onChange }: { kind: Kind; onChange: (k: Kind) => void }) {
  const cls = (k: Kind) =>
    `flex-1 rounded-lg px-4 py-2.5 text-sm transition ${
      kind === k ? 'bg-surface-2 font-semibold text-txt shadow-sm' : 'text-muted hover:text-txt'
    }`;
  return (
    <div className="flex gap-1 rounded-xl bg-bg p-1">
      <button onClick={() => onChange('craft')} className={cls('craft')}>
        🔨 Крафт
      </button>
      <button onClick={() => onChange('flip')} className={cls('flip')}>
        💱 Перекуп
      </button>
    </div>
  );
}

/* ---------------- диалог продажи ---------------- */

function SellModal({
  trade,
  onClose,
  onCraft,
  onFlip,
}: {
  trade: Trade;
  onClose: () => void;
  onCraft: (patch: import('../../lib/api').TradeInput) => void;
  onFlip: (sell: number) => void;
}) {
  const isCraft = trade.kind === 'craft';
  const m = isCraft ? craftMetrics(trade) : null;
  const [sell, setSell] = useState('');
  const [sold, setSold] = useState(m ? String(m.soldUnits) : '');
  const [listPrice, setListPrice] = useState(m && m.listPrice != null ? String(m.listPrice) : '');

  const confirm = () => {
    if (isCraft) {
      const su = Math.min(Number(sold) || 0, trade.qty);
      const lp = Number(listPrice) || 0;
      onCraft({
        item: trade.item,
        qty: trade.qty,
        buy: trade.buy,
        kind: 'craft',
        soldUnits: su,
        soldRevenue: lp && su ? lp * su : null,
        listPrice: lp || null,
      });
    } else {
      const s = Number(sell) || 0;
      if (s > 0) onFlip(s);
    }
  };

  return (
    <Modal
      title={`Продать — ${trade.item}`}
      subtitle={isCraft ? `Скрафчено ${trade.qty} шт` : `${trade.qty} шт · куплено по ${money(trade.buy)}`}
      onClose={onClose}
      footer={<ModalActions onCancel={onClose} onSubmit={confirm} tone="green" />}
    >
      {isCraft ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Продано штук" hint={`всего, из ${trade.qty}`}>
              <input type="number" value={sold} onChange={(e) => setSold(e.target.value)} className={inputCls} autoFocus />
            </Field>
            <Field label="Цена выставления" hint="за штуку">
              <input type="number" value={listPrice} onChange={(e) => setListPrice(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="rounded-lg bg-bg/50 px-3.5 py-2.5 text-xs text-muted">
            Выручка посчитается сама: цена выставления × продано.
          </div>
        </div>
      ) : (
        <Field label="Цена продажи" hint={`за штуку, ${trade.qty} шт`}>
          <input type="number" value={sell} onChange={(e) => setSell(e.target.value)} className={inputCls} autoFocus />
        </Field>
      )}
    </Modal>
  );
}

/* ---------------- полное редактирование карточки ---------------- */

function FullEditModal({
  trade,
  onClose,
  onSave,
}: {
  trade: Trade;
  onClose: () => void;
  onSave: (patch: import('../../lib/api').TradeInput) => void;
}) {
  const isCraft = trade.kind === 'craft';
  const m = isCraft ? craftMetrics(trade) : null;
  const [item, setItem] = useState(trade.item);
  const [qty, setQty] = useState(String(trade.qty));
  const [buy, setBuy] = useState(String(trade.buy ?? ''));
  const [materials, setMaterials] = useState(m ? String(m.materials) : '');
  const [listPrice, setListPrice] = useState(m && m.listPrice != null ? String(m.listPrice) : '');
  const [sold, setSold] = useState(m ? String(m.soldUnits) : '');
  const [sell, setSell] = useState(trade.sell != null ? String(trade.sell) : '');

  const save = () => {
    const q = Number(qty) || 0;
    if (!item.trim() || q <= 0) return;
    if (isCraft) {
      const mat = Number(materials) || 0;
      const lp = Number(listPrice) || 0;
      const su = Math.min(Number(sold) || 0, q);
      onSave({
        item: item.trim(),
        qty: q,
        buy: mat / q,
        kind: 'craft',
        materials: mat,
        listPrice: lp || null,
        soldUnits: su,
        soldRevenue: lp && su ? lp * su : null,
      });
    } else {
      onSave({
        item: item.trim(),
        qty: q,
        buy: Number(buy) || 0,
        sell: sell === '' ? null : Number(sell) || 0,
      });
    }
  };

  return (
    <Modal
      title={`Правка — ${trade.item}`}
      subtitle={isCraft ? '🔨 крафт' : '💱 перекуп'}
      onClose={onClose}
      footer={<ModalActions onCancel={onClose} onSubmit={save} />}
    >
      <div className="flex flex-col gap-4">
        <Field label="Товар">
          <input value={item} onChange={(e) => setItem(e.target.value)} className={inputCls} />
        </Field>
        {isCraft ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Скрафчено" hint="штук всего">
                <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Материалы" hint="суммарно потрачено">
                <input type="number" value={materials} onChange={(e) => setMaterials(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Выставл/шт" hint="цена на маркете">
                <input type="number" value={listPrice} onChange={(e) => setListPrice(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Продано" hint="штук ушло">
                <input type="number" value={sold} onChange={(e) => setSold(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="rounded-lg bg-bg/50 px-3.5 py-2.5 text-xs text-muted">
              Выручка и P&L считаются автоматически: выставл/шт × продано − себестоимость.
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <Field label="Кол-во">
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Цена покупки">
              <input type="number" value={buy} onChange={(e) => setBuy(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Цена продажи">
              <input type="number" value={sell} onChange={(e) => setSell(e.target.value)} placeholder="не продано" className={inputCls} />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${size === 'lg' ? 'max-w-3xl' : 'max-w-xl'} overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-2xl shadow-black/50`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-7 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{title}</h2>
            {subtitle != null && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-lg leading-none text-muted hover:bg-surface-2 hover:text-txt"
          >
            ✕
          </button>
        </div>
        <div className="px-7 py-6">{children}</div>
        {footer != null && (
          <div className="flex justify-end gap-2 border-t border-line bg-bg/40 px-7 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

/** Кнопки подвала диалога. */
function ModalActions({
  onCancel,
  onSubmit,
  submitLabel = 'Сохранить',
  tone = 'accent',
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  tone?: 'accent' | 'green';
}) {
  return (
    <>
      <button
        onClick={onCancel}
        className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium hover:bg-surface-2"
      >
        Отмена
      </button>
      <button
        onClick={onSubmit}
        className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 ${
          tone === 'green' ? 'bg-green' : 'bg-accent'
        }`}
      >
        {submitLabel}
      </button>
    </>
  );
}

const inputCls =
  'w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-[15px] tabular-nums outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';

function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  );
}
