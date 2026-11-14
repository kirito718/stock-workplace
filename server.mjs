import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const cninfo = 'https://www.cninfo.com.cn';
const headers = { 'User-Agent': 'touyantai-workbench/0.1', Referer: `${cninfo}/new/index` };

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
async function json(res, status, body) {
  cors(res); res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body));
}
async function proxy(req, res, url) {
  try {
    const upstream = await fetch(url, { method: req.method, headers: { ...headers, ...(req.method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } : {}) }, body: req.method === 'POST' ? await new Promise((resolveBody, reject) => { let data = ''; req.on('data', (chunk) => { data += chunk; }); req.on('end', () => resolveBody(data)); req.on('error', reject); }) : undefined });
    const text = await upstream.text();
    cors(res); res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8' }); res.end(text);
  } catch (error) { await json(res, 502, { error: 'upstream_unavailable', message: error.message }); }
}
async function serve(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }
  if (pathname === '/api/cninfo/stocks') return proxy(req, res, `${cninfo}/new/data/szse_stock.json`);
  if (pathname === '/api/cninfo/announcements') return proxy(req, res, `${cninfo}/new/hisAnnouncement/query`);
  const requested = pathname === '/' ? '/index.html' : pathname;
  const file = resolve(join(root, normalize(requested)));
  if (!file.startsWith(root)) return json(res, 403, { error: 'forbidden' });
  try { await stat(file); const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[extname(file)] || 'application/octet-stream'; res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); res.end(await readFile(file)); }
  catch { json(res, 404, { error: 'not_found' }); }
}
createServer((req, res) => serve(req, res)).listen(port, '0.0.0.0', () => console.log(`投研台正在启动：http://127.0.0.1:${port}`));
