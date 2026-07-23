'use client';

import { useMemo, useState } from 'react';
import { computeGovDeals, money, nf, type GovDeal } from '@kupec/core';
import { useStore } from '../../lib/store';
import { Badge, Card, DataTable, type Column } from '../ui';

/** Подсказка по действию: что делать и почему выгодно. */
function actionCell(d: GovDeal) {
  if (d.action === 'sell')
    return (
      <span className="inline-flex items-center gap-1.5" title={`Скупщик берёт до ${money(d.gov.max)}, рынок ~${money(d.marketAvg)} — сдать НПС выгоднее и мгновенно`}>
        <Badge tone="green">сдать скупщику</Badge>
        <span className="font-semibold text-green">+{money(d.edge)}</span>
      </span>
    );
  if (d.action === 'flip')
    return (
      <span className="inline-flex items-center gap-1.5" title={`НПС продаёт от ${money(d.gov.pmin)}, рынок ~${money(d.marketAvg)} — купить у НПС и перепродать`}>
        <Badge tone="accent">купить у НПС</Badge>
        <span className="font-semibold text-accent-2">+{money(d.edge)}</span>
      </span>
    );
  return <span className="text-muted">—</span>;
}

const columns: Column<GovDeal>[] = [
  { key: 'name', header: 'Товар', sortVal: (d) => d.gov.name, render: (d) => d.gov.name },
  { key: 'cat', header: 'Скупщик', sortVal: (d) => d.gov.cat, render: (d) => <Badge>{d.gov.cat}</Badge> },
  {
    key: 'buy',
    header: 'Скупка НПС',
    align: 'right',
    sortVal: (d) => d.gov.max ?? 0,
    render: (d) => `${money(d.gov.min)} – ${money(d.gov.max)}`,
  },
  {
    key: 'sell',
    header: 'Продажа игроку',
    align: 'right',
    sortVal: (d) => d.gov.pmax ?? 0,
    render: (d) => `${money(d.gov.pmin)} – ${money(d.gov.pmax)}`,
  },
  {
    key: 'market',
    header: 'Рынок ~',
    align: 'right',
    sortVal: (d) => d.marketAvg ?? -1,
    render: (d) =>
      d.marketAvg == null ? (
        <span className="text-muted">—</span>
      ) : (
        <span>
          {money(d.marketAvg)}
          <span className="ml-1.5 text-[11px] text-muted">{nf(d.market?.sold)} прод</span>
        </span>
      ),
  },
  { key: 'edge', header: 'Выгода', align: 'right', sortVal: (d) => d.edge, render: actionCell },
];

export function GovTab() {
  const { rows } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('*');
  const [onlyDeals, setOnlyDeals] = useState(false);

  const deals = useMemo(() => computeGovDeals(rows), [rows]);
  const cats = useMemo(() => Array.from(new Set(deals.map((d) => d.gov.cat))).sort(), [deals]);
  const dealCount = useMemo(() => deals.filter((d) => d.action).length, [deals]);
  const hasMarket = useMemo(() => rows.some((r) => r._path === 'items'), [rows]);

  const data = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return deals.filter(
      (d) =>
        (cat === '*' || d.gov.cat === cat) &&
        (!ql || d.gov.name.toLowerCase().includes(ql)) &&
        (!onlyDeals || d.action != null),
    );
  }, [deals, q, cat, onlyDeals]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-accent/30 bg-accent/5 p-3 text-xs leading-relaxed text-muted">
        Гос-цены скупщиков (НПС) × живой рынок. Ищем <b className="text-txt">гарантированные</b>{' '}
        сделки: <b className="text-green">сдать скупщику</b>, когда НПС берёт дороже рынка (продаёшь
        мгновенно, без ожидания покупателя), и <b className="text-accent-2">купить у НПС</b>, когда он
        продаёт дешевле рынка (перепродать на рынке). Цены НПС — вилка, «Выгода» считается по лучшему
        случаю относительно средней рыночной. Сравниваем только с <b className="text-txt">живым
        рынком</b> (есть цена и хотя бы несколько продаж) — рядом видно число продаж, на редких
        товарах цена может врать.
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск товара…"
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
        >
          <option value="*">Все скупщики</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={() => setOnlyDeals((v) => !v)}
          disabled={!hasMarket}
          className={`rounded-lg px-3 py-1.5 text-sm transition disabled:opacity-40 ${
            onlyDeals ? 'bg-green/15 font-semibold text-green' : 'border border-line text-muted hover:bg-surface-2 hover:text-txt'
          }`}
        >
          💰 Только выгодные {dealCount > 0 && <span className="opacity-70">{dealCount}</span>}
        </button>
        <span className="text-sm text-muted">{data.length} позиций</span>
      </div>

      {!hasMarket && (
        <div className="rounded-lg border border-amber/30 bg-amber/5 px-4 py-2.5 text-xs text-muted">
          Загрузи рынок (кнопка «С сервера» или «Импорт») — колонки «Рынок» и «Выгода» появятся.
        </div>
      )}

      <Card>
        <DataTable
          columns={columns}
          data={data}
          defaultSort={{ key: hasMarket ? 'edge' : 'name', dir: hasMarket ? -1 : 1 }}
          rowKey={(d, i) => `${d.gov.name}:${i}`}
        />
      </Card>
    </div>
  );
}
