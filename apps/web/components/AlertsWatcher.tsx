'use client';

import { useEffect, useRef } from 'react';
import { targetHit } from '@kupec/core';
import { useAuth } from '../lib/auth';
import { rowKey, useStore } from '../lib/store';
import { track } from './../lib/analytics';

/** Как часто подтягивать свежий рынок с сервера (мс). */
const REFRESH_MS = 3 * 60 * 1000;

/**
 * Фоновый наблюдатель: авто-обновляет рынок с API и шлёт браузерное уведомление,
 * когда избранный товар впервые достигает ценовой цели. Ничего не рендерит.
 */
export function AlertsWatcher() {
  const { api } = useAuth();
  const { server, favRows, getTarget, importedPaths, loadServerRows } = useStore();
  const prevHit = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  // Периодически тянем свежие цены (только если данные уже загружены).
  useEffect(() => {
    if (importedPaths.length === 0) return;
    const id = setInterval(() => {
      api
        .getMarket(server)
        .then((r) => loadServerRows(server, r.rows))
        .catch(() => {});
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [api, server, importedPaths.length, loadServerRows]);

  // Детект новых достижений цели → уведомление.
  useEffect(() => {
    const nowHit = new Set<string>();
    for (const r of favRows) {
      const t = getTarget(rowKey(r));
      if (t && targetHit(r, t)) nowHit.add(rowKey(r));
    }

    // Первый прогон — просто запоминаем состояние, без спама уведомлений.
    if (!seeded.current) {
      prevHit.current = nowHit;
      seeded.current = true;
      return;
    }

    for (const r of favRows) {
      const k = rowKey(r);
      if (nowHit.has(k) && !prevHit.current.has(k)) {
        const t = getTarget(k)!;
        notify(
          `🎯 ${r.name}`,
          t.type === 'buy' ? `Можно купить ≤ ${t.price}` : `Можно продать ≥ ${t.price}`,
        );
        track('alert_fired', { type: t.type });
      }
    }
    prevHit.current = nowHit;
  }, [favRows, getTarget]);

  return null;
}

function notify(title: string, body: string) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: '/icon.svg' });
  } catch {
    /* ignore */
  }
}
