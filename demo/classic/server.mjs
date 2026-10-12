import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.DEMO_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DEMO_PORT must be between 1 and 65535.');
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/engine.js', ['engine.js', 'text/javascript; charset=utf-8']],
  ['/game.js', ['game.js', 'text/javascript; charset=utf-8']],
]);

// Serve only the four demo assets. Backend files and local configuration stay inaccessible.
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
  }
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
  const file = files.get(pathname);
  if (!file) { response.writeHead(404); response.end('Not found.'); return; }
  try {
    const contents = await readFile(new URL(file[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch {
    response.writeHead(500); response.end('Unable to read demo asset.');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Classic demo: http://127.0.0.1:${port}`));
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => { server.close(); server.closeAllConnections(); });
}
