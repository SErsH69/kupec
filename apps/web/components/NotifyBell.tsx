'use client';

import { useEffect, useState } from 'react';

type Perm = 'default' | 'granted' | 'denied' | 'unsupported';

/** Кнопка включения браузерных уведомлений о достижении ценовых целей. */
export function NotifyBell() {
  const [perm, setPerm] = useState<Perm>('default');

  useEffect(() => {
    if (typeof Notification === 'undefined') setPerm('unsupported');
    else setPerm(Notification.permission);
  }, []);

  if (perm === 'unsupported') return null;

  const request = () => {
    if (perm === 'granted') return;
    Notification.requestPermission().then((p) => setPerm(p));
  };

  const granted = perm === 'granted';
  return (
    <button
      onClick={request}
      title={
        granted
          ? 'Уведомления включены — сообщу, когда цель достигнута'
          : 'Включить уведомления о достижении цены'
      }
      className={`rounded-lg border px-3 py-1.5 text-sm ${
        granted ? 'border-green/40 text-green' : 'border-line hover:bg-surface-2'
      }`}
    >
      {granted ? '🔔' : '🔕'}
    </button>
  );
}
