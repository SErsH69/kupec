'use client';

import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useStore } from '../lib/store';
import { serverName } from '@kupec/core';

export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, changePassword, logout } = useAuth();
  const { server } = useStore();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open || !user) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-[var(--radius-xl)] border border-line bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Профиль</h2>
          <button onClick={onClose} className="text-muted hover:text-txt">
            ✕
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-base font-bold text-accent">
            {user.email[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user.email}</div>
            <div className="text-xs text-muted">
              Сервер по умолчанию: {server} · {serverName(server) ?? ''} (запоминается сам)
            </div>
          </div>
        </div>

        <div className="border-t border-line/50 pt-4">
          <div className="mb-2 text-sm font-medium">Сменить пароль</div>
          <div className="flex flex-col gap-2">
            <input
              type="password"
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              placeholder="текущий пароль"
              className={inputCls}
            />
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="новый пароль (≥6 символов)"
              className={inputCls}
            />
          </div>
          {msg && (
            <div className={`mt-2 text-sm ${msg.ok ? 'text-green' : 'text-red'}`}>
              {msg.ok ? '✓ ' : '✗ '}
              {msg.text}
            </div>
          )}
          <button
            onClick={submit}
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? '…' : 'Сменить пароль'}
          </button>
        </div>

        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="mt-4 w-full rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-surface-2 hover:text-txt"
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}

const inputCls =
  'rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent';
