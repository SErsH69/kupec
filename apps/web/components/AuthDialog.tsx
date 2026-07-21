'use client';

import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Modal } from './ui';
import { LegalDialog, type LegalTab } from './LegalDialog';

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [legal, setLegal] = useState<LegalTab | null>(null);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    if (mode === 'register' && !agree) {
      setError('Нужно принять условия, чтобы зарегистрироваться');
      return;
    }
    setBusy(true);
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

  const isReg = mode === 'register';

  return (
    <>
      <Modal
        title={isReg ? 'Регистрация' : 'Вход в аккаунт'}
        subtitle="Личные данные хранятся в аккаунте и синхронизируются между устройствами"
        onClose={onClose}
        footer={
          <>
            <button
              onClick={onClose}
              className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium hover:bg-surface-2"
            >
              Отмена
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? '…' : isReg ? 'Создать аккаунт' : 'Войти'}
            </button>
          </>
        }
      >
        <div className="mb-5 flex gap-1 rounded-xl bg-bg p-1 text-sm">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 rounded-lg py-2 ${!isReg ? 'bg-surface-2 font-semibold text-txt shadow-sm' : 'text-muted'}`}
          >
            Вход
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 rounded-lg py-2 ${isReg ? 'bg-surface-2 font-semibold text-txt shadow-sm' : 'text-muted'}`}
          >
            Регистрация
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="минимум 6 символов"
              className={inputCls}
            />
          </label>
        </div>

        {isReg && (
          <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs text-muted select-none">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 accent-[var(--color-accent)]"
            />
            <span>
              Принимаю{' '}
              <button type="button" onClick={() => setLegal('terms')} className="text-accent-2 underline">
                пользовательское соглашение
              </button>{' '}
              и{' '}
              <button type="button" onClick={() => setLegal('privacy')} className="text-accent-2 underline">
                политику конфиденциальности
              </button>
              , даю согласие на обработку персональных данных.
            </span>
          </label>
        )}

        {error && <div className="mt-3 text-sm text-red">✗ {error}</div>}
      </Modal>

      <LegalDialog open={legal != null} tab={legal ?? 'privacy'} onClose={() => setLegal(null)} />
    </>
  );
}

const inputCls =
  'w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';
