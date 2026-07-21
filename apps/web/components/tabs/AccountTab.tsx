'use client';

import { useEffect, useState } from 'react';
import { money } from '@kupec/core';
import { useAuth } from '../../lib/auth';
import { useJournal } from '../../lib/journal';
import { Card } from '../ui';

/**
 * Личный кабинет: профиль, тариф, безопасность, данные.
 * Тариф — честно: сейчас всё бесплатно, Pro показан как «скоро» без покупки
 * (нет платёжного провайдера; по плану Pro вводится позже).
 */
export function AccountTab() {
  const { user, api, changePassword, logout } = useAuth();
  const { trades } = useJournal();

  if (!user) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <ProfileCard email={user.email} api={api} />
      <TariffCard />
      <PasswordCard changePassword={changePassword} />
      <DataCard trades={trades} logout={logout} />
    </div>
  );
}

function ProfileCard({ email, api }: { email: string; api: ReturnType<typeof useAuth>['api'] }) {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getSettings()
      .then((s) => {
        if (!alive) return;
        setName(s.name ?? '');
        setSaved(s.name ?? '');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [api]);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api.updateSettings({ name: name.trim() });
      setSaved(name.trim());
      setMsg('Сохранено');
    } catch {
      setMsg('Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const initial = (name || email)[0]?.toUpperCase();

  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/20 text-2xl font-bold text-accent">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{name || 'Игрок'}</div>
          <div className="truncate text-sm text-muted">{email}</div>
        </div>
      </div>

      <div className="mt-4 border-t border-line/50 pt-4">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">Имя</label>
        <div className="mt-1.5 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как тебя показывать"
            className="flex-1 rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={save}
            disabled={busy || name.trim() === saved}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            {busy ? '…' : 'Сохранить'}
          </button>
        </div>
        {msg && <div className="mt-1.5 text-xs text-muted">{msg}</div>}
        <div className="mt-1.5 text-[11px] text-muted">
          Email — логин, менять его пока нельзя. Имя хранится в аккаунте и синхронизируется.
        </div>
      </div>
    </Card>
  );
}

function TariffCard() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <div className="text-sm font-semibold">Тариф</div>
          <div className="text-xs text-muted">Сейчас всё бесплатно</div>
        </div>
        <span className="rounded-full bg-green/15 px-3 py-1 text-xs font-semibold text-green">Бесплатный</span>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-bg/40 p-4">
          <div className="text-sm font-semibold">Бесплатный</div>
          <div className="mt-0.5 text-xs text-muted">Всё, что есть сейчас</div>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            <Feat on>Аналитика рынка, крафт, кухня, фарм</Feat>
            <Feat on>Журнал сделок с P&amp;L</Feat>
            <Feat on>Цели и прокачка дома</Feat>
            <Feat on>Алерты (пока вкладка открыта)</Feat>
          </ul>
        </div>

        <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Pro</span>
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
              Скоро
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted">Появится после запуска сервера</div>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            <Feat>Пуши, даже когда приложение закрыто</Feat>
            <Feat>История цен глубже 30 дней</Feat>
            <Feat>Общий журнал группы без ограничений</Feat>
            <Feat>Экспорт и синхронизация между устройствами</Feat>
          </ul>
          <div className="mt-3 rounded-lg bg-bg/60 px-3 py-2 text-[11px] leading-relaxed text-muted">
            Оплату подключим, когда заработает сервер и накопится история. Сейчас всё это либо
            уже бесплатно, либо в разработке — платить не за что.
          </div>
        </div>
      </div>
    </Card>
  );
}

function Feat({ children, on }: { children: React.ReactNode; on?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <span className={on ? 'text-green' : 'text-muted/60'}>{on ? '✓' : '•'}</span>
      <span className={on ? '' : 'text-muted'}>{children}</span>
    </li>
  );
}

function PasswordCard({
  changePassword,
}: {
  changePassword: (cur: string, next: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setMsg(null);
    if (next.length < 6) {
      setMsg({ ok: false, text: 'Новый пароль — минимум 6 символов' });
      return;
    }
    setBusy(true);
    const res = await changePassword(cur, next);
    setBusy(false);
    if (res.ok) {
      setCur('');
      setNext('');
      setMsg({ ok: true, text: 'Пароль изменён' });
    } else {
      setMsg({ ok: false, text: res.error ?? 'Ошибка' });
    }
  };

  return (
    <Card className="p-5">
      <div className="text-sm font-semibold">Безопасность</div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          value={cur}
          onChange={(e) => setCur(e.target.value)}
          placeholder="текущий пароль"
          className="flex-1 rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="новый (≥6 символов)"
          className="flex-1 rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {busy ? '…' : 'Сменить'}
        </button>
      </div>
      {msg && (
        <div className={`mt-2 text-sm ${msg.ok ? 'text-green' : 'text-red'}`}>
          {msg.ok ? '✓ ' : '✗ '}
          {msg.text}
        </div>
      )}
    </Card>
  );
}

function DataCard({
  trades,
  logout,
}: {
  trades: { item: string }[];
  logout: () => void;
}) {
  const exportJournal = () => {
    const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kupec-journal-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-5">
      <div className="text-sm font-semibold">Данные</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={exportJournal}
          disabled={trades.length === 0}
          className="rounded-lg border border-line px-4 py-2.5 text-sm hover:bg-surface-2 disabled:opacity-40"
        >
          📥 Экспорт журнала ({trades.length})
        </button>
        <button
          onClick={logout}
          className="ml-auto rounded-lg px-4 py-2.5 text-sm text-muted hover:bg-red/15 hover:text-red"
        >
          Выйти из аккаунта
        </button>
      </div>
    </Card>
  );
}
