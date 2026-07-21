'use client';

import { useEffect, useState } from 'react';
import { LegalDialog } from './LegalDialog';

const KEY = 'kupec.cookie.v1';

/**
 * Уведомление об использовании cookie/localStorage (152-ФЗ, практика для РФ).
 * По умолчанию сервис использует только технические хранилища для работы.
 */
export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [legal, setLegal] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* ignore */
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-xs leading-relaxed text-muted">
            Мы используем cookie и локальное хранилище браузера, чтобы сервис работал (вход,
            настройки, ваши данные). Продолжая, вы соглашаетесь с{' '}
            <button onClick={() => setLegal(true)} className="text-accent-2 underline">
              политикой конфиденциальности
            </button>
            .
          </p>
          <button
            onClick={accept}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Понятно
          </button>
        </div>
      </div>
      <LegalDialog open={legal} tab="privacy" onClose={() => setLegal(false)} />
    </>
  );
}
