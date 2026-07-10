import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rate-limiter';

/** Управляемое время: now() читает переменную, sleep() двигает её вперёд. */
function harness() {
  let t = 0;
  const slept: number[] = [];
  const now = () => t;
  const sleep = async (ms: number) => {
    slept.push(ms);
    t += ms;
  };
  return { now, sleep, slept, advance: (ms: number) => (t += ms) };
}

describe('RateLimiter', () => {
  it('пропускает первые max запросов без ожидания', async () => {
    const h = harness();
    const rl = new RateLimiter(5, 60_000, h.now, h.sleep);
    for (let i = 0; i < 5; i++) await rl.acquire();
    expect(h.slept).toEqual([]);
    expect(rl.used()).toBe(5);
  });

  it('6-й запрос ждёт до освобождения окна', async () => {
    const h = harness();
    const rl = new RateLimiter(5, 60_000, h.now, h.sleep);
    for (let i = 0; i < 5; i++) await rl.acquire(); // t=0
    await rl.acquire(); // должен поспать ~60000+50
    expect(h.slept.length).toBe(1);
    expect(h.slept[0]).toBe(60_050);
  });

  it('освобождает слоты по мере выхода из окна', async () => {
    const h = harness();
    const rl = new RateLimiter(5, 60_000, h.now, h.sleep);
    for (let i = 0; i < 5; i++) await rl.acquire();
    h.advance(60_001); // все 5 отметок вышли из окна
    expect(rl.used()).toBe(0);
    await rl.acquire();
    expect(h.slept).toEqual([]); // ждать не пришлось
  });
});
