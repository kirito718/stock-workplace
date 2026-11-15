import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const cninfo = 'https://www.cninfo.com.cn';
const headers = { 'User-Agent': 'touyantai-workbench/0.1', Referer: `${cninfo}/new/index` };
const UPSTREAM_TIMEOUT_MS = 10000;
const STOCK_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_BODY_BYTES = 256 * 1024;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 60;
const corsOrigin = process.env.CORS_ORIGIN || '';
let stockCache = null;
const rateBuckets = new Map();

function cors(res) {
  if (corsOrigin) res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function allowRequest(req) {
  const now = Date.now();
  const key = req.socket.remoteAddress || 'unknown';
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}
async function readBody(req) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > MAX_BODY_BYTES) throw Object.assign(new Error('request_body_too_large'), { status: 413 });
  return await new Promise((resolveBody, reject) => {
    let data = ''; let size = 0; let rejected = false;
    req.on('data', (chunk) => { if (rejected) return; size += chunk.length; if (size > MAX_BODY_BYTES) { rejected = true; reject(Object.assign(new Error('request_body_too_large'), { status: 413 })); return; } data += chunk; });
    req.on('end', () => { if (!rejected) resolveBody(data); }); req.on('error', (error) => { if (!rejected) reject(error); });
  });
}
async function json(res, status, body) {
  cors(res); res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body));
}
async function proxy(req, res, url) {
  try {
    if (req.method === 'GET' && url.endsWith('/szse_stock.json') && stockCache && stockCache.expiresAt > Date.now()) {
      cors(res); res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'X-Cache': 'HIT' }); return res.end(stockCache.body);
    }
    const body = req.method === 'POST' ? await readBody(req) : undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    const upstream = await fetch(url, { method: req.method, headers: { ...headers, ...(req.method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } : {}) }, body, signal: controller.signal });
    clearTimeout(timeout);
    const text = await upstream.text();
    if (req.method === 'GET' && url.endsWith('/szse_stock.json') && upstream.ok) stockCache = { body: text, expiresAt: Date.now() + STOCK_CACHE_TTL_MS };
    cors(res); res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8', 'X-Cache': 'MISS' }); res.end(text);
  } catch (error) { const status = error.status || (error.name === 'AbortError' ? 504 : 502); await json(res, status, { error: error.status === 413 ? 'request_body_too_large' : (error.name === 'AbortError' ? 'upstream_timeout' : 'upstream_unavailable'), message: error.message }); }
}
async function serve(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }
  if (pathname.startsWith('/api/') && !allowRequest(req)) { res.setHeader('Retry-After', '60'); return json(res, 429, { error: 'rate_limited', message: '请求过于频繁，请稍后重试' }); }
  if (pathname === '/api/cninfo/stocks') return proxy(req, res, `${cninfo}/new/data/szse_stock.json`);
  if (pathname === '/api/cninfo/announcements') return proxy(req, res, `${cninfo}/new/hisAnnouncement/query`);
  const requested = pathname === '/' ? '/index.html' : pathname;
  const file = resolve(join(root, normalize(requested)));
  if (!file.startsWith(root)) return json(res, 403, { error: 'forbidden' });
  try { await stat(file); const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[extname(file)] || 'application/octet-stream'; res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); res.end(await readFile(file)); }
  catch { json(res, 404, { error: 'not_found' }); }
}
createServer((req, res) => serve(req, res)).listen(port, '0.0.0.0', () => console.log(`投研台正在启动：http://127.0.0.1:${port}`));
