import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  if (pathname === '/') pathname = '/index.html';
  // Expose only the game and its public art assets.
  const relative = pathname.slice(1);
  if ((relative !== 'index.html' && !relative.startsWith('assets/')) || relative.split('/').some(p => p.startsWith('.')) || relative.includes('\\')) {
    res.writeHead(404); return res.end('Not found');
  }
  const filename = path.resolve(root, relative);
  if (!filename.startsWith(root)) { res.writeHead(404); return res.end('Not found'); }
  try {
    const info = await stat(filename);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD') return res.end();
    const stream = createReadStream(filename);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => { console.error(`预览服务启动失败：${error.message}`); process.exit(1); });
server.listen(port, '0.0.0.0', () => {
  console.log(`\n肥嘟嘟大冒险\n本机：http://localhost:${port}`);
  for (const addresses of Object.values(networkInterfaces())) {
    for (const item of addresses || []) {
      if (item.family === 'IPv4' && !item.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address)) console.log(`手机：http://${item.address}:${port}`);
    }
  }
  console.log('手机和电脑连接同一个 Wi-Fi。按 Ctrl+C 停止。\n');
});
