/**
 * Ограничитель: не более `max` запусков за скользящее окно `windowMs`.
 * Порт логики rl/rlWait из прототипа. Требование Majestic: 5 запросов / 60 сек.
 * `now`/`sleep` инъектируются для тестов.
 */
export class RateLimiter {
  private stamps: number[] = [];

  constructor(
    private readonly max = 5,
    private readonly windowMs = 60_000,
    private readonly now: () => number = () => Date.now(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
  ) {}

  /** Дождаться свободного слота и занять его. */
  async acquire(): Promise<void> {
    const now = this.now();
    this.stamps = this.stamps.filter((t) => now - t < this.windowMs);
    if (this.stamps.length < this.max) {
      this.stamps.push(now);
      return;
    }
    const wait = this.windowMs - (now - this.stamps[0]!) + 50;
    await this.sleep(wait);
    return this.acquire();
  }

  /** Сколько слотов занято в текущем окне. */
  used(): number {
    const now = this.now();
    return this.stamps.filter((t) => now - t < this.windowMs).length;
  }
}
