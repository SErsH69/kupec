'use client';

import { useState } from 'react';
import { useAuth } from '../lib/auth';

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = mode === 'register' ? await register(email, password) : await login(email, password);
    setBusy(false);
    if (res.ok) {
      setEmail('');
      setPassword('');
      onClose();
    } else {
      setError(res.error ?? 'Ошибка');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-[var(--radius-xl)] border border-line bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex gap-1 rounded-lg bg-bg p-1 text-sm">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 rounded-md py-1.5 ${mode === 'login' ? 'bg-surface-2 font-medium text-txt' : 'text-muted'}`}
          >
            Вход
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 rounded-md py-1.5 ${mode === 'register' ? 'bg-surface-2 font-medium text-txt' : 'text-muted'}`}
          >
            Регистрация
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            autoFocus
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="пароль (≥6 символов)"
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        {error && <div className="mt-2 text-sm text-red">✗ {error}</div>}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? '…' : mode === 'register' ? 'Создать аккаунт' : 'Войти'}
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          Аккаунт синхронизирует журнал сделок между устройствами.
        </p>
      </div>
    </div>
  );
}
