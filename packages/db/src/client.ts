import postgres from 'postgres';

export type Sql = postgres.Sql;

/**
 * Подключение к Postgres. URL из аргумента или env DATABASE_URL.
 * Пример: postgres://kupec:pass@localhost:5432/kupec
 */
export function createDb(url: string | undefined = process.env.DATABASE_URL): Sql {
  if (!url) throw new Error('DATABASE_URL не задан');
  return postgres(url, {
    max: 10,
    idle_timeout: 20,
    onnotice: () => {},
  });
}
