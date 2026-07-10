import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';
import { enrich, SERVERS, type MarketPath } from '@kupec/core';
import {
  addTrade,
  closeTrade,
  createUser,
  deleteTrade,
  findUserByEmail,
  latestRows,
  listTrades,
  type Sql,
} from '@kupec/db';
import { hashPassword, signToken, verifyPassword, verifyToken } from './auth';

type Env = { Variables: { userId: string } };

/** Собрать Hono-приложение поверх подключения к БД (для тестов — с мок-совместимым sql). */
export function createApp(sql: Sql) {
  const app = new Hono<Env>();
  app.use('*', cors());

  app.get('/health', (c) => c.json({ ok: true }));
  app.get('/v1/servers', (c) => c.json(SERVERS));

  // Рынок: последние строки (enrich из core — perDay/turnover/…).
  app.get('/v1/market/:server', async (c) => {
    const rows = (await latestRows(sql, c.req.param('server'))).map(enrich);
    return c.json({ server: c.req.param('server'), rows });
  });
  app.get('/v1/market/:server/:path', async (c) => {
    const rows = (await latestRows(sql, c.req.param('server'), c.req.param('path') as MarketPath)).map(enrich);
    return c.json({ server: c.req.param('server'), path: c.req.param('path'), rows });
  });

  // --- авторизация ---
  app.post('/v1/auth/register', async (c) => {
    const { email, password } = await c.req.json().catch(() => ({}));
    if (!validEmail(email) || !validPassword(password))
      return c.json({ error: 'email и пароль (≥6 символов) обязательны' }, 400);
    if (await findUserByEmail(sql, email)) return c.json({ error: 'email уже занят' }, 409);
    const user = await createUser(sql, email, await hashPassword(password));
    return c.json({ token: await signToken(user.id), user: { id: user.id, email: user.email } });
  });

  app.post('/v1/auth/login', async (c) => {
    const { email, password } = await c.req.json().catch(() => ({}));
    if (!validEmail(email) || !validPassword(password)) return c.json({ error: 'неверные данные' }, 400);
    const user = await findUserByEmail(sql, email);
    if (!user || !(await verifyPassword(password, user.password_hash)))
      return c.json({ error: 'неверный email или пароль' }, 401);
    return c.json({ token: await signToken(user.id), user: { id: user.id, email: user.email } });
  });

  // --- защищённые: журнал сделок ---
  const auth = async (c: Context<Env>, next: Next) => {
    const header = c.req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const userId = token ? await verifyToken(token) : null;
    if (!userId) return c.json({ error: 'unauthorized' }, 401);
    c.set('userId', userId);
    await next();
    return;
  };

  app.get('/v1/trades', auth, async (c) => c.json({ trades: await listTrades(sql, c.get('userId')) }));

  app.post('/v1/trades', auth, async (c) => {
    const b = await c.req.json().catch(() => ({}));
    if (!b.item || !(b.qty > 0) || !(b.buy > 0)) return c.json({ error: 'item, qty, buy обязательны' }, 400);
    const trade = await addTrade(sql, c.get('userId'), b);
    return c.json({ trade });
  });

  app.post('/v1/trades/:id/close', auth, async (c) => {
    const { sell } = await c.req.json().catch(() => ({}));
    if (!(sell > 0)) return c.json({ error: 'sell обязателен' }, 400);
    await closeTrade(sql, c.get('userId'), c.req.param('id')!, sell);
    return c.json({ ok: true });
  });

  app.delete('/v1/trades/:id', auth, async (c) => {
    await deleteTrade(sql, c.get('userId'), c.req.param('id')!);
    return c.json({ ok: true });
  });

  return app;
}

function validEmail(v: unknown): v is string {
  return typeof v === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}
function validPassword(v: unknown): v is string {
  return typeof v === 'string' && v.length >= 6;
}
