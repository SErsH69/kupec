// Крошечный статик-сервер для проверки экспортированного web-бандла (apps/mobile/dist).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const root = new URL('./dist/', import.meta.url);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.css': 'text/css',
  '.map': 'application/json',
  '.ttf': 'font/ttf',
};

createServer(async (req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  let served = p;
  let data;
  try {
    data = await readFile(new URL('.' + p, root));
  } catch {
    data = await readFile(new URL('./index.html', root)); // SPA fallback
    served = '/index.html';
  }
  res.setHeader('content-type', types[extname(served)] || 'application/octet-stream');
  res.end(data);
}).listen(8083, () => console.log('mobile-web on http://localhost:8083'));
