import { useEffect, useRef } from 'react';
import { targetHit } from '@kupec/core';
import { rowKey, useMarket } from '../lib/market';
import { notify } from '../lib/notifications';

/** Как часто подтягивать свежий рынок (мс). */
const REFRESH_MS = 3 * 60 * 1000;

/**
 * Фоновый наблюдатель: авто-обновляет рынок и шлёт локальное уведомление,
 * когда избранный товар впервые достигает ценовой цели. Ничего не рендерит.
 * (Уведомления при закрытом приложении — follow-up: нужен пуш-сервер.)
 */
export function AlertsWatcher() {
  const { loaded, load, favRows, getTarget } = useMarket();
  const prevHit = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(() => {
      void load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [loaded, load]);

  useEffect(() => {
    const nowHit = new Set<string>();
    for (const r of favRows) {
      const t = getTarget(rowKey(r));
      if (t && targetHit(r, t)) nowHit.add(rowKey(r));
    }

    if (!seeded.current) {
      prevHit.current = nowHit;
      seeded.current = true;
      return;
    }

    for (const r of favRows) {
      const k = rowKey(r);
      if (nowHit.has(k) && !prevHit.current.has(k)) {
        const t = getTarget(k)!;
        void notify(
          `🎯 ${r.name}`,
          t.type === 'buy' ? `Можно купить ≤ ${t.price}` : `Можно продать ≥ ${t.price}`,
        );
      }
    }
    prevHit.current = nowHit;
  }, [favRows, getTarget]);

  return null;
}
