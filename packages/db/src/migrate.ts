import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb, type Sql } from './client';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

/** Прогнать все .sql миграции по порядку, отмечая применённые в таблице migrations. */
export async function migrate(sql: Sql): Promise<string[]> {
  await sql`
    create table if not exists migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;
  const applied = new Set((await sql<{ name: string }[]>`select name from migrations`).map((r) => r.name));
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  const ran: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const text = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`insert into migrations ${tx({ name: file })}`;
    });
    ran.push(file);
  }
  return ran;
}

// Прямой запуск: `pnpm --filter @kupec/db migrate`
if (import.meta.url === `file://${process.argv[1]}`) {
  const sql = createDb();
  migrate(sql)
    .then((ran) => {
      console.log(ran.length ? `Применены миграции: ${ran.join(', ')}` : 'Миграции актуальны');
      return sql.end();
    })
    .catch(async (e) => {
      console.error('Ошибка миграции:', e);
      await sql.end();
      process.exit(1);
    });
}
