const base = process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 4173}`;
const checks = [
  ['首页', '/'],
  ['巨潮股票目录代理', '/api/cninfo/stocks']
];
let failed = false;
for (const [label, path] of checks) {
  try {
    const response = await fetch(`${base}${path}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (path !== '/') {
      const body = await response.json();
      if (!Array.isArray(body.stockList) || !body.stockList.length) throw new Error('stockList 为空');
    }
    console.log(`OK  ${label}`);
  } catch (error) { failed = true; console.error(`ERR ${label}: ${error.message}`); }
}
try {
  const response = await fetch(`${base}/api/cninfo/announcements`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ pageNum: '1', pageSize: '3', column: 'szse', tabName: 'fulltext', stock: '600519,gssh0600519', seDate: '2026-01-01~2026-11-14', isHLtitle: 'true' }) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body.announcements)) throw new Error('announcements 字段缺失');
  console.log(`OK  巨潮公告代理 (${body.announcements.length} 条)`);
} catch (error) { failed = true; console.error(`ERR 巨潮公告代理: ${error.message}`); }
if (failed) process.exit(1);
