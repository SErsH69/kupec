import { serve } from '@hono/node-server';
import pino from 'pino';
import { createDb } from '@kupec/db';
import { createApp } from './app';

const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const port = Number(process.env.PORT ?? 8787);

const sql = createDb();
const app = createApp(sql);

serve({ fetch: app.fetch, port }, (info) => {
  log.info({ port: info.port }, 'api: слушаю');
});
