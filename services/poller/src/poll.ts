import { parseEnriched, PATHS, type MarketPath } from '@kupec/core';
import { insertSnapshots, recordPollRun, type Sql } from '@kupec/db';
import type { MajesticClient } from './majestic';

export interface PollResult {
  serverId: string;
  path: string;
  ok: boolean;
  rows: number;
  error?: string;
}

/** Опросить один раздел одного сервера: fetch → parse (core) → upsert (db) → лог. */
export async function pollPath(
  sql: Sql,
  client: MajesticClient,
  serverId: string,
  path: MarketPath,
  now: () => Date = () => new Date(),
): Promise<PollResult> {
  const startedAt = now();
  try {
    const json = await client.get(path, serverId);
    const parsed = parseEnriched(json);
    const rows = await insertSnapshots(sql, serverId, path, parsed.rows, startedAt);
    await recordPollRun(sql, { serverId, path, rows, ok: true, startedAt, finishedAt: now() });
    return { serverId, path, ok: true, rows };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await recordPollRun(sql, { serverId, path, rows: 0, ok: false, error, startedAt, finishedAt: now() });
    return { serverId, path, ok: false, rows: 0, error };
  }
}

/**
 * Опросить набор серверов по всем разделам. Запросы сериализуются общим
 * ограничителем внутри клиента (5/60с). Возвращает результаты по каждому разделу.
 */
export async function pollAll(
  sql: Sql,
  client: MajesticClient,
  serverIds: string[],
  paths: readonly MarketPath[] = PATHS,
  now: () => Date = () => new Date(),
): Promise<PollResult[]> {
  const results: PollResult[] = [];
  for (const serverId of serverIds) {
    for (const path of paths) {
      results.push(await pollPath(sql, client, serverId, path, now));
    }
  }
  return results;
}
