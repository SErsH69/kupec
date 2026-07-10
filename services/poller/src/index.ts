import pino from 'pino';
import { SERVERS, type MarketPath } from '@kupec/core';
import { createDb, migrate } from '@kupec/db';
import { MajesticClient } from './majestic';
import { pollAll } from './poll';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });

/** Интервал опроса (Majestic обновляется ~раз в 30 мин). */
const INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 30 * 60 * 1000);

/** Какие серверы опрашивать (env POLL_SERVERS="RU17,RU1"), по умолчанию — все. */
function serverIds(): string[] {
  const env = process.env.POLL_SERVERS?.trim();
  if (env) return env.split(',').map((s) => s.trim()).filter(Boolean);
  return SERVERS.map((s) => s.id);
}

/** Какие разделы опрашивать (env POLL_PATHS), по умолчанию — все. */
function paths(): MarketPath[] | undefined {
  const env = process.env.POLL_PATHS?.trim();
  return env ? (env.split(',').map((s) => s.trim()) as MarketPath[]) : undefined;
}

async function main() {
  const sql = createDb();
  await migrate(sql);
  const client = new MajesticClient();
  const servers = serverIds();
  const ps = paths();

  const tick = async () => {
    const started = Date.now();
    log.info({ servers: servers.length }, 'poll: старт цикла');
    const results = ps ? await pollAll(sql, client, servers, ps) : await pollAll(sql, client, servers);
    const ok = results.filter((r) => r.ok).length;
    const rows = results.reduce((a, r) => a + r.rows, 0);
    log.info(
      { ok, failed: results.length - ok, rows, ms: Date.now() - started },
      'poll: цикл завершён',
    );
  };

  await tick();
  setInterval(() => {
    tick().catch((e) => log.error({ err: String(e) }, 'poll: ошибка цикла'));
  }, INTERVAL_MS);
}

main().catch((e) => {
  log.error({ err: String(e) }, 'poller: фатальная ошибка');
  process.exit(1);
});
