'use client';

import type { ReactNode } from 'react';

interface Step {
  n: number;
  title: string;
  text: string;
}

/**
 * Экран-объяснялка для личных вкладок у неавторизованных.
 * Продаёт функцию: что даёт, шаги, наклонённое мок-превью, кнопка регистрации.
 * Готово под будущий Pro — достаточно поменять подпись/кнопку.
 */
export function FeaturePromo({
  icon,
  title,
  subtitle,
  steps,
  mock,
  onLogin,
}: {
  icon: string;
  title: string;
  subtitle: string;
  steps: Step[];
  mock: ReactNode;
  onLogin: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        {/* Левая колонка — текст и шаги */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2/50 px-3 py-1 text-xs text-muted">
            <span>{icon}</span> Личная функция · бесплатно в бете
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>

          <div className="mt-6 flex flex-col gap-3">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                  {s.n}
                </div>
                <div>
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-sm text-muted">{s.text}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onLogin}
            className="mt-7 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 hover:opacity-90"
          >
            Войти / Регистрация — бесплатно
          </button>
          <div className="mt-2 text-xs text-muted">
            Нужен аккаунт: данные личные и синхронизируются между устройствами.
          </div>
        </div>

        {/* Правая колонка — наклонённое превью */}
        <div className="relative hidden min-h-[340px] items-center justify-center lg:flex">
          <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-xl)] bg-gradient-to-br from-accent/10 to-transparent blur-2xl" />
          {mock}
        </div>
      </div>

      {/* Превью на мобильном — под текстом, по центру */}
      <div className="mt-8 flex justify-center lg:hidden">{mock}</div>
    </div>
  );
}

/* ---------------- превью-моки (нарисованы, не картинки) ---------------- */

function Row({ l, r, tone }: { l: string; r: string; tone?: 'green' | 'accent' }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted">{l}</span>
      <span className={tone === 'green' ? 'font-semibold text-green' : tone === 'accent' ? 'text-accent-2' : ''}>
        {r}
      </span>
    </div>
  );
}

/** Превью «Цели»: карточка проекта + строки материалов, слегка повёрнута. */
export function GoalsMock() {
  return (
    <div className="relative">
      <div className="w-72 rotate-[-5deg] rounded-2xl border border-line bg-surface p-4 shadow-2xl shadow-black/40">
        <div className="text-sm font-bold">🏠 Прокачка дома #1256</div>
        <div className="mt-1 text-[11px] text-muted">Готово 51% · осталось $23.4M</div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
          <div className="h-full w-1/2 rounded-full bg-accent" />
        </div>
        <div className="mt-3 flex flex-col gap-2 rounded-lg bg-bg/50 p-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span>Промышленные металлы</span>
            <span className="rounded bg-accent/15 px-1.5 text-accent">крафт</span>
          </div>
          <Row l="осталось 140 · крафт $2 115/шт" r="$296k" />
          <div className="flex items-center justify-between text-[11px]">
            <span>Обработанная древесина</span>
            <span className="rounded bg-accent/15 px-1.5 text-accent">крафт</span>
          </div>
          <Row l="дешевле скрафтить в 10×" r="$245k" tone="green" />
        </div>
      </div>
      <div className="absolute -right-3 -top-3 rotate-[8deg] rounded-xl border border-green/40 bg-green/15 px-3 py-1.5 text-xs font-semibold text-green shadow-lg">
        где дешевле — рынок или крафт ✓
      </div>
    </div>
  );
}

/** Превью «Журнал»: карточка сделки с P&L, повёрнута в другую сторону. */
export function JournalMock() {
  return (
    <div className="relative">
      <div className="w-72 rotate-[5deg] rounded-2xl border border-line bg-surface p-4 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold">Сталь</div>
          <div className="text-lg font-black text-green">+$80 000</div>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
          <span className="rounded bg-amber/15 px-1.5 text-amber">🔨 крафт</span>
          ROI 50%
        </div>
        <div className="mt-3 flex flex-col gap-1.5 rounded-lg bg-bg/50 p-2.5">
          <Row l="материалы" r="$160 000" />
          <Row l="скрафчено / продано" r="8 / 8 шт" />
          <Row l="выручка" r="$240 000" tone="green" />
        </div>
      </div>
      <div className="absolute -left-4 -bottom-3 rotate-[-7deg] rounded-xl border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-2 shadow-lg">
        P&amp;L и ROI считаются сами ↗
      </div>
    </div>
  );
}
