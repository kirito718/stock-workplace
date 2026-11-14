const stocks = [
  { code: '600519', name: '贵州茅台', initial: '茅', color: 'purple', price: '1,468.20', change: '+1.36%', trend: 'positive', signal: '观察', signalType: 'watch', filter: ['focus'], score: 78, copy: '估值消化中，等待量能确认', industry: '白酒', amount: 42.8, turnover: 2.14, risk: '估值偏高', reasons: ['北向资金连续 3 日净流入', '20 日均线拐点向上，短期动能修复', '估值位于近三年 72% 分位'] },
  { code: '300750', name: '宁德时代', initial: '宁', color: 'green', price: '248.56', change: '+2.84%', trend: 'positive', signal: '关注', signalType: 'focus', filter: ['focus', 'volatile'], score: 84, copy: '产业链景气度回升，动能较强', industry: '新能源', amount: 68.4, turnover: 3.72, risk: '高波动', reasons: ['电池级碳酸锂价格企稳反弹', '成交量较 20 日均值放大 1.8 倍', '短线波动率处于近 60 日高位'] },
  { code: '601318', name: '中国平安', initial: '平', color: 'blue', price: '52.18', change: '+0.42%', trend: 'positive', signal: '持有', signalType: 'hold', filter: [], score: 71, copy: '防御属性稳定，等待催化剂', industry: '保险', amount: 25.6, turnover: 0.86, risk: '催化不足', reasons: ['保险负债端表现平稳', '股息率仍具吸引力', '短期缺乏明确增量催化'] },
  { code: '000858', name: '五粮液', initial: '五', color: 'orange', price: '138.72', change: '-0.86%', trend: 'negative', signal: '观察', signalType: 'watch', filter: ['volatile'], score: 63, copy: '渠道库存仍需时间消化', industry: '白酒', amount: 18.2, turnover: 1.32, risk: '需求偏弱', reasons: ['批价维持平稳，需求恢复偏慢', '短期资金面出现分歧', '估值已回到历史中位数附近'] }
];

const aiInsights = {
  conclusion: (stock) => `<strong>${stock.signal === '关注' ? '偏积极，关注回踩机会' : stock.signal === '持有' ? '防御持有，等待催化剂' : '短线观察，等待量能确认'}。</strong><span>${stock.copy}，当前综合评分 ${stock.score} 分。</span>`,
  basis: (stock) => `<strong>技术 + 资金 + 基本面</strong><span>${stock.reasons[0]}；${stock.reasons[1]}。估值处于近三年中位区间上方。</span>`,
  risk: (stock) => `<strong class="risk-text">主要风险：${stock.risk}</strong><span>若成交额跌破 20 日均值，模型会下调信号；事件数据存在时滞。</span>`,
  compare: (stock) => `<strong>行业相对强度</strong><span>${stock.name} 在 ${stock.industry} 行业的相对评分为 ${stock.score}，高于行业中位数约 ${Math.max(4, stock.score - 62)} 分。</span>`
};

const STORAGE_KEYS = { stocks: 'touyantai.watchlist.v1', portfolio: 'touyantai.portfolio.v1', preferences: 'touyantai.preferences.v1', provider: 'touyantai.provider.v1', updatedAt: 'touyantai.updatedAt.v1', researchLog: 'touyantai.research-log.v1' };
const storage = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* private browsing or disabled storage: keep session state */ } }
};
const savedStocks = storage.get(STORAGE_KEYS.stocks, null);
if (Array.isArray(savedStocks) && savedStocks.length) stocks.splice(0, stocks.length, ...savedStocks);
let portfolioHoldings = storage.get(STORAGE_KEYS.portfolio, [
  { code: '600519', qty: 120, cost: 1412, weight: 32 },
  { code: '300750', qty: 300, cost: 231.8, weight: 24 }
]);
let currentProvider = storage.get(STORAGE_KEYS.provider, 'demo');
let dataUpdatedAt = storage.get(STORAGE_KEYS.updatedAt, '11月11日 09:32');
let researchLog = storage.get(STORAGE_KEYS.researchLog, []);
const httpConfig = window.TOUYANTAI_CONFIG || { quoteEndpoint: '', newsEndpoint: '' };
let demoNews = null;
const announcementFixtures = [
  { code: '600519', issuer: '贵州茅台', eventType: '业绩披露', severity: 'high', source: '上交所', publishedAt: '2026-10-31', url: 'https://www.sse.com.cn/assortment/stock/list/info/announcement/index.shtml?productId=600519', title: '贵州茅台：前三季度经营数据与业绩说明会安排', body: '公司披露前三季度经营数据，并公告业绩说明会安排。建议跟踪收入、利润增速与渠道库存变化。' },
  { code: '300750', issuer: '宁德时代', eventType: '员工激励', severity: 'medium', source: '巨潮资讯', publishedAt: '2026-11-03', url: 'https://www.cninfo.com.cn/new/commonUrl?pageOfSearch', title: '宁德时代：员工持股计划预留份额授予完成', body: '公司完成员工持股计划预留份额授予，关注激励约束、费用摊销与后续兑现条件。' },
  { code: '000858', issuer: '五粮液', eventType: '股东增持', severity: 'high', source: '巨潮资讯', publishedAt: '2026-10-29', url: 'https://www.cninfo.com.cn/new/commonUrl?pageOfSearch', title: '五粮液：控股股东累计增持 36,949,691 股', body: '控股股东在区间内累计增持约 0.95% 股份，属于需要跟踪的股东行为事件。' },
  { code: '601318', issuer: '中国平安', eventType: '治理变动', severity: 'medium', source: '上交所', publishedAt: '2026-10-16', url: 'https://www.sse.com.cn/disclosure/listedinfo/announcement/index.shtml?productId=601318', title: '中国平安：非执行董事辞任', body: '公司披露非执行董事辞任，建议核对治理影响及后续董事会安排。' }
];
function normalizeAnnouncement(item, index = 0) {
  const fixture = announcementFixtures.find((entry) => item.code && String(entry.code) === String(item.code)) || announcementFixtures.find((entry) => item.title && item.title.includes(entry.issuer));
  return { ...item, code: item.code || fixture?.code || '', issuer: item.issuer || fixture?.issuer || '', eventType: item.eventType || fixture?.eventType || item.category || '资讯', severity: item.severity || fixture?.severity || 'low', source: item.source || fixture?.source || '公开信息聚合', publishedAt: item.publishedAt || fixture?.publishedAt || item.time || '', url: item.url || fixture?.url || '', parserStatus: item.parserStatus || 'normalized', id: item.id || `${item.code || fixture?.code || 'news'}-${index}-${String(item.title || '').slice(0, 12)}` };
}
const providers = {
  demo: {
    label: '演示数据',
    async load() { await new Promise((resolve) => setTimeout(resolve, 260)); return { stocks: stocks.map((stock) => ({ ...stock })), news: demoNews, source: '演示因子库' }; }
  },
  http: {
    label: 'HTTP API',
    async load() {
      if (!httpConfig.quoteEndpoint) throw new Error('尚未配置 quoteEndpoint，请在 window.TOUYANTAI_CONFIG 中填写公开行情接口。');
      const response = await fetch(httpConfig.quoteEndpoint, { headers: httpConfig.headers || {} });
      if (!response.ok) throw new Error(`行情接口返回 ${response.status}`);
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : (payload.stocks || payload.data || []);
      if (!rows.length) throw new Error('行情接口没有返回可识别的 stocks 数组。');
      let news = null;
      if (httpConfig.newsEndpoint) {
        const newsResponse = await fetch(httpConfig.newsEndpoint, { headers: httpConfig.headers || {} });
        if (!newsResponse.ok) throw new Error(`资讯接口返回 ${newsResponse.status}`);
        const newsPayload = await newsResponse.json();
        const newsRows = Array.isArray(newsPayload) ? newsPayload : (newsPayload.news || newsPayload.announcements || newsPayload.data || []);
        news = newsRows.map(normalizeHttpNews);
      }
      return { stocks: rows.map(normalizeHttpStock), news, source: 'HTTP API' };
    }
  }
};

function normalizeHttpStock(row, index) {
  const name = row.name || row.symbol || row.code || `标的 ${index + 1}`;
  const code = String(row.code || row.symbol || `HTTP${index + 1}`).replace(/\s/g, '');
  const changeValue = Number(row.changePercent ?? row.change ?? 0);
  const sign = changeValue > 0 ? '+' : '';
  return { code, name, initial: name.slice(0, 1), color: ['purple', 'green', 'blue', 'orange'][index % 4], price: row.price ?? row.last ?? '—', change: `${sign}${changeValue}%`, trend: changeValue >= 0 ? 'positive' : 'negative', signal: '待研判', signalType: 'hold', filter: [], score: Number(row.score || 60), copy: '来自 HTTP API 的行情，等待更多因子', industry: row.industry || '未分类', amount: Number(row.amount || 0), turnover: Number(row.turnover || 0), risk: '数据源待核验', reasons: ['行情由外部 HTTP API 返回', '公告与基本面因子尚未接入', '请核验字段口径与更新时间'] };
}

function normalizeHttpNews(row, index) {
  return normalizeAnnouncement({ time: row.time || row.publishedAt || '刚刚', publishedAt: row.publishedAt, category: row.category || row.type || '资讯', title: row.title || row.name || `HTTP 资讯 ${index + 1}`, body: row.body || row.summary || row.content || '该条资讯由 HTTP API 返回，暂未提供摘要。', code: row.code || row.symbol, source: row.source || 'HTTP API', url: row.url || row.link }, index);
}

const els = {
  body: document.getElementById('watchlistBody'), search: document.getElementById('stockSearch'), globalSearch: document.getElementById('globalSearch'), metricFilter: document.getElementById('metricFilter'), providerSelect: document.getElementById('providerSelect'), dataStatus: document.getElementById('dataStatus'), aiName: document.getElementById('aiStockName'), aiScore: document.getElementById('aiScore'), aiSignal: document.getElementById('aiSignal'), aiCopy: document.getElementById('aiSignalCopy'), aiSource: document.getElementById('aiSource'), reasons: document.getElementById('reasonList'), aiTabContent: document.getElementById('aiTabContent'), chartName: document.getElementById('chartStockName'), chartPrice: document.getElementById('chartPrice'), portfolioBody: document.getElementById('portfolioBody'), toast: document.getElementById('toast'), modal: document.getElementById('modalBackdrop'), newsModal: document.getElementById('newsModal'), watchModal: document.getElementById('watchModal'), portfolioModal: document.getElementById('portfolioModal')
};
demoNews = Array.from(document.querySelectorAll('.news-item')).map((item, index) => normalizeAnnouncement({ time: item.querySelector('.news-time')?.textContent || '刚刚', category: item.dataset.newsCategory || '资讯', title: item.dataset.newsTitle || item.querySelector('.news-title')?.textContent || '', body: item.dataset.newsBody || '' }, index));
let activeFilter = 'all';
let activeMetric = 'all';
let activeAiTab = 'conclusion';
let activeStock = stocks[0];
let toastTimer;

function sparkline(isNegative = false) {
  const d = isNegative ? 'M1 8 C11 9 17 13 25 12 S39 18 48 16 S61 20 72 19 S80 23 87 22' : 'M1 22 C12 20 16 10 27 14 S39 8 49 11 S61 5 69 8 S79 4 87 2';
  return `<span class="sparkline ${isNegative ? 'negative' : ''}"><svg viewBox="0 0 88 25" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>`;
}

function renderWatchlist() {
  const query = els.search.value.trim().toLowerCase();
  const filtered = stocks.filter((stock) => {
    const filterMatch = activeFilter === 'all' || stock.filter.includes(activeFilter);
    const metricMatch = activeMetric === 'all' || (activeMetric === 'gainers' && Number(stock.change.replace('%', '')) > 1) || (activeMetric === 'score' && stock.score >= 75) || (activeMetric === 'amount' && stock.amount >= 40) || (activeMetric === 'risk' && stock.risk !== '催化不足');
    const queryMatch = !query || `${stock.name}${stock.code}`.toLowerCase().includes(query);
    return filterMatch && metricMatch && queryMatch;
  });
  els.body.innerHTML = filtered.length ? filtered.map((stock) => `<tr data-code="${stock.code}" tabindex="0"><td><div class="stock-cell"><div class="stock-avatar ${stock.color}">${stock.initial}</div><div><div class="stock-main">${stock.name}</div><div class="stock-code">${stock.code} · ${stock.industry}</div></div></div></td><td class="price-cell">${stock.price}</td><td class="${stock.trend === 'positive' ? 'change-positive' : 'change-negative'}">${stock.change}</td><td>${sparkline(stock.trend === 'negative')}</td><td><span class="ai-mini-badge ${stock.signalType}">✦ ${stock.signal}</span></td><td><button class="row-menu remove-stock" data-remove-code="${stock.code}" aria-label="从自选删除">×</button></td></tr>`).join('') : '<tr><td colspan="6" class="empty-state">没有匹配的股票，换个关键词试试</td></tr>';
  els.body.querySelectorAll('tr[data-code]').forEach((row) => {
    row.addEventListener('click', () => selectStock(row.dataset.code));
    row.addEventListener('keydown', (event) => { if (event.key === 'Enter') selectStock(row.dataset.code); });
  });
  els.body.querySelectorAll('.remove-stock').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); removeStock(button.dataset.removeCode); }));
}

function removeStock(code) {
  const index = stocks.findIndex((stock) => stock.code === code);
  if (index < 0) return;
  const removed = stocks.splice(index, 1)[0];
  renderWatchlist();
  showToast(`${removed.name} 已从自选移除`);
  if (activeStock.code === code && stocks.length) selectStock(stocks[0].code, false);
}

function selectStock(code) {
  const stock = stocks.find((item) => item.code === code);
  if (!stock) return;
  activeStock = stock;
  els.aiName.innerHTML = `${stock.name} <span>${stock.code}</span>`;
  els.aiScore.textContent = stock.score;
  els.aiSignal.textContent = stock.signal;
  els.aiSignal.className = `signal-badge ${stock.signalType === 'focus' ? 'buy' : stock.signalType === 'hold' ? 'watch' : stock.signalType}`;
  els.aiCopy.textContent = stock.copy;
  els.aiSource.textContent = `${dataUpdatedAt} · 来源：${providers[currentProvider]?.label || '演示因子库'} · 综合 14 项指标`;
  els.reasons.innerHTML = stock.reasons.map((reason, index) => `<div class="reason-item"><span class="reason-icon ${index === 2 ? 'caution' : 'positive'}">${index === 0 ? '↗' : index === 1 ? '⌁' : '!'}</span><span>${reason}</span></div>`).join('');
  els.aiTabContent.innerHTML = aiInsights[activeAiTab](stock);
  els.chartName.textContent = stock.name;
  els.chartPrice.textContent = stock.price;
  if (arguments.length < 2 || arguments[1] !== false) showToast(`已切换到 ${stock.name} 的研判`);
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add('show');
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function persistWorkspace() {
  storage.set(STORAGE_KEYS.stocks, stocks);
  storage.set(STORAGE_KEYS.portfolio, portfolioHoldings);
  storage.set(STORAGE_KEYS.provider, currentProvider);
  storage.set(STORAGE_KEYS.updatedAt, dataUpdatedAt);
}

function stockForHolding(holding) {
  return stocks.find((stock) => stock.code === holding.code) || { code: holding.code, name: holding.name || holding.code, initial: (holding.name || holding.code).slice(0, 1), color: 'blue', price: '—', change: '—', trend: 'positive' };
}

function renderPortfolio() {
  const totalWeight = portfolioHoldings.reduce((sum, holding) => sum + Number(holding.weight || 0), 0) || 1;
  els.portfolioBody.innerHTML = portfolioHoldings.length ? portfolioHoldings.map((holding, index) => {
    const stock = stockForHolding(holding);
    const numericPrice = Number(String(stock.price).replace(/,/g, ''));
    const pnl = Number.isFinite(numericPrice) ? Math.round((numericPrice - Number(holding.cost || 0)) * Number(holding.qty || 0)) : 0;
    const pnlClass = pnl >= 0 ? 'change-positive' : 'change-negative';
    const displayPnl = pnl >= 0 ? `+${pnl.toLocaleString('zh-CN')}` : pnl.toLocaleString('zh-CN');
    return `<tr><td><div class="stock-cell"><div class="stock-avatar ${stock.color}">${stock.initial}</div><div><div class="stock-main">${stock.name}</div><div class="stock-code">${stock.code}</div></div></div></td><td>${holding.qty} / ${Number(holding.cost || 0).toFixed(2)}</td><td class="price-cell">${stock.price}</td><td class="${pnlClass}">${displayPnl}</td><td><div class="position-bar"><span style="width:${Math.min(100, Number(holding.weight || 0))}%"></span></div><small>${Number(holding.weight || 0)}%</small></td><td><button class="row-menu portfolio-edit" data-portfolio-index="${index}" aria-label="编辑持仓">✎</button><button class="row-menu portfolio-remove" data-portfolio-remove="${index}" aria-label="删除持仓">×</button></td></tr>`;
  }).join('') : '<tr><td colspan="6" class="empty-state">暂未记录持仓，点击“记录持仓”开始</td></tr>';
  els.portfolioBody.querySelectorAll('.portfolio-edit').forEach((button) => button.addEventListener('click', () => openPortfolioModal(Number(button.dataset.portfolioIndex))));
  els.portfolioBody.querySelectorAll('.portfolio-remove').forEach((button) => button.addEventListener('click', () => { portfolioHoldings.splice(Number(button.dataset.portfolioRemove), 1); persistWorkspace(); renderPortfolio(); showToast('持仓已删除'); }));
  const summaryCount = document.querySelector('.portfolio-summary > div:last-child strong');
  if (summaryCount) summaryCount.innerHTML = `${portfolioHoldings.length} <small>只</small>`;
  const summaryWeight = portfolioHoldings.reduce((sum, holding) => sum + Number(holding.weight || 0), 0);
  if (summaryCount) summaryCount.title = `已记录仓位 ${summaryWeight}%`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function renderNewsItems(items, sourceLabel = 'HTTP API') {
  const tagClasses = { 公告: 'blue-tag', 行业: 'amber-tag', 机构: 'purple-tag', 资金: 'green-tag' };
  const list = document.getElementById('newsList');
  const normalizedItems = items.map((item, index) => normalizeAnnouncement(item, index));
  list.innerHTML = normalizedItems.length ? normalizedItems.map((item) => {
    const category = item.category || '资讯';
    return `<button class="news-item" data-news-id="${escapeHtml(item.id)}" data-news-code="${escapeHtml(item.code)}" data-news-category="${escapeHtml(category)}" data-news-event="${escapeHtml(item.eventType)}" data-news-severity="${escapeHtml(item.severity)}" data-news-source="${escapeHtml(item.source)}" data-news-url="${escapeHtml(item.url)}" data-news-parser="${escapeHtml(item.parserStatus)}" data-news-published="${escapeHtml(item.publishedAt || item.time)}" data-news-title="${escapeHtml(item.title)}" data-news-body="${escapeHtml(item.body)}"><span class="news-time">${escapeHtml(item.time || item.publishedAt || '刚刚')}</span><span class="news-tag ${tagClasses[category] || 'blue-tag'}">${escapeHtml(category)}</span><span class="news-title">${escapeHtml(item.title)}</span><span class="news-arrow">↗</span></button>`;
  }).join('') : '<div class="empty-state">接口返回 0 条资讯</div>';
  document.getElementById('newsCount').textContent = `${items.length} 条`;
  document.querySelector('.news-footer').innerHTML = `<span class="source-dot"></span>来源：${escapeHtml(sourceLabel)} <span class="source-time">${dataUpdatedAt}</span>`;
  bindNewsItems();
}

function setDataStatus(text, state = 'ready') {
  const dot = state === 'error' ? '<span class="live-dot error-dot"></span>' : state === 'loading' ? '<span class="live-dot loading-dot"></span>' : '<span class="live-dot"></span>';
  els.dataStatus.innerHTML = `${dot}${text}`;
  els.dataStatus.classList.toggle('is-error', state === 'error');
}

async function refreshData(providerId = currentProvider) {
  currentProvider = providerId;
  const provider = providers[providerId] || providers.demo;
  setDataStatus('数据加载中…', 'loading');
  try {
    const result = await provider.load();
    if (!Array.isArray(result.stocks) || !result.stocks.length) throw new Error('数据源返回空结果。');
    stocks.splice(0, stocks.length, ...result.stocks);
    dataUpdatedAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    persistWorkspace();
    renderWatchlist();
    renderPortfolio();
    if (Array.isArray(result.news)) renderNewsItems(result.news, result.source);
    else if (providerId === 'http') renderNewsItems([], 'HTTP API 未配置 newsEndpoint');
    selectStock(stocks[0].code, false);
    setDataStatus(`${provider.label} · ${dataUpdatedAt}`);
    showToast(`${provider.label}已更新 · ${dataUpdatedAt}`);
  } catch (error) {
    setDataStatus(`数据源不可用 · ${dataUpdatedAt}`, 'error');
    if (providerId === 'http') renderNewsItems([], 'HTTP API 不可用');
    showToast(error.message || '数据刷新失败，已保留上次数据');
    if (providerId !== 'demo') { els.providerSelect.value = currentProvider; }
  }
}

function openPortfolioModal(index = null) {
  const title = document.getElementById('portfolioModalTitle');
  const submit = document.getElementById('portfolioModalSubmit');
  const codeInput = document.getElementById('portfolioStockInput');
  const qtyInput = document.getElementById('portfolioQtyInput');
  const costInput = document.getElementById('portfolioCostInput');
  const weightInput = document.getElementById('portfolioWeightInput');
  const holding = index === null ? null : portfolioHoldings[index];
  title.textContent = holding ? '编辑持仓' : '记录持仓';
  submit.dataset.editIndex = index === null ? '' : String(index);
  codeInput.value = holding ? holding.code : '';
  qtyInput.value = holding ? holding.qty : '';
  costInput.value = holding ? holding.cost : '';
  weightInput.value = holding ? holding.weight : '';
  els.portfolioModal.hidden = false;
  codeInput.focus();
}

document.querySelectorAll('.tab-btn').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.tab-btn').forEach((item) => item.classList.remove('is-active'));
  button.classList.add('is-active');
  activeFilter = button.dataset.filter;
  renderWatchlist();
}));
els.search.addEventListener('input', renderWatchlist);
els.metricFilter.addEventListener('change', (event) => { activeMetric = event.target.value; renderWatchlist(); showToast(activeMetric === 'all' ? '已清除筛选条件' : '已应用筛选条件'); });
els.globalSearch.addEventListener('input', (event) => { els.search.value = event.target.value; activeFilter = 'all'; document.querySelectorAll('.tab-btn').forEach((item) => item.classList.toggle('is-active', item.dataset.filter === 'all')); renderWatchlist(); });
els.globalSearch.addEventListener('keydown', (event) => { if (event.key === 'Enter') { document.getElementById('watchlist').scrollIntoView({ behavior: 'smooth', block: 'start' }); showToast('已定位到自选列表'); } });

document.querySelectorAll('.ai-tab').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.ai-tab').forEach((item) => item.classList.remove('is-active'));
  button.classList.add('is-active');
  activeAiTab = button.dataset.aiTab;
  els.aiTabContent.innerHTML = aiInsights[activeAiTab](activeStock);
}));

document.querySelectorAll('.news-filter').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.news-filter').forEach((item) => item.classList.remove('is-active'));
  button.classList.add('is-active');
  const category = button.dataset.newsFilter;
  let visible = 0;
  document.querySelectorAll('.news-item').forEach((item) => { const show = category === 'all' || item.dataset.newsCategory === category; item.hidden = !show; if (show) visible += 1; });
  document.getElementById('newsCount').textContent = `${visible} 条`;
}));

function bindNewsItems() {
  document.querySelectorAll('.news-item').forEach((item) => item.addEventListener('click', () => {
    document.getElementById('newsModalTitle').textContent = item.dataset.newsTitle;
    document.getElementById('newsModalBody').textContent = item.dataset.newsBody;
    document.getElementById('newsModalKicker').textContent = `${item.dataset.newsCategory} · ${item.dataset.newsEvent || '资讯'}`;
    document.getElementById('newsModalSource').textContent = `来源：${item.dataset.newsSource || '公开信息聚合'} · ${item.dataset.newsParser === 'normalized' ? '已标准化' : '待解析'}`;
    document.getElementById('newsModalTime').textContent = item.querySelector('.news-time').textContent;
    document.getElementById('newsModalMeta').textContent = `标的：${item.dataset.newsCode || '未关联'} · 影响等级：${item.dataset.newsSeverity || 'low'} · 抓取时间：${dataUpdatedAt}`;
    document.getElementById('newsModalLog').dataset.newsId = item.dataset.newsId || '';
    document.getElementById('newsModalLog').dataset.newsTitle = item.dataset.newsTitle || '';
    document.getElementById('newsModalLog').dataset.newsCode = item.dataset.newsCode || '';
    document.getElementById('newsModalLog').dataset.newsEvent = item.dataset.newsEvent || item.dataset.newsCategory || '资讯';
    document.getElementById('newsModalLog').dataset.newsSource = item.dataset.newsSource || '公开信息聚合';
    document.getElementById('newsModalLog').dataset.newsUrl = item.dataset.newsUrl || '';
    els.newsModal.hidden = false;
  }));
}
bindNewsItems();
document.getElementById('newsModalLog').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const entry = { id: button.dataset.newsId || `log-${Date.now()}`, code: button.dataset.newsCode || '', title: button.dataset.newsTitle || '', eventType: button.dataset.newsEvent || '资讯', source: button.dataset.newsSource || '公开信息聚合', url: button.dataset.newsUrl || '', thesis: '待补充：这条公告对投资判断意味着什么？', risk: '待补充：需要验证的风险与反例。', followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), createdAt: new Date().toISOString() };
  const existing = researchLog.find((item) => item.id === entry.id);
  if (!existing) { researchLog.unshift(entry); storage.set(STORAGE_KEYS.researchLog, researchLog); showToast('已加入研究日志，7 天后复核'); }
  else showToast('这条公告已在研究日志中');
});

document.querySelectorAll('.range-btn').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.range-btn').forEach((item) => item.classList.remove('is-active'));
  button.classList.add('is-active');
  const range = button.dataset.range;
  const line = document.getElementById('chartLinePath');
  const area = document.getElementById('chartAreaPath');
  const paths = {
    '1D': ['M0 184 C35 184 48 166 75 171 S114 137 140 151 S184 121 212 133 S254 105 286 118 S329 91 356 110 S397 83 429 96 S469 78 495 90 S531 63 566 78 S610 48 642 62 S696 43 760 20', 'M0 184 C35 184 48 166 75 171 S114 137 140 151 S184 121 212 133 S254 105 286 118 S329 91 356 110 S397 83 429 96 S469 78 495 90 S531 63 566 78 S610 48 642 62 S696 43 760 20 V250 H0 Z'],
    '1W': ['M0 167 C42 143 66 174 108 149 S173 130 220 147 S273 80 325 111 S390 97 438 123 S488 72 534 91 S588 97 632 59 S704 71 760 44', 'M0 167 C42 143 66 174 108 149 S173 130 220 147 S273 80 325 111 S390 97 438 123 S488 72 534 91 S588 97 632 59 S704 71 760 44 V250 H0 Z'],
    '1M': ['M0 191 C42 187 60 155 103 167 S151 106 198 132 S253 136 295 95 S339 113 380 99 S439 75 478 92 S520 51 557 71 S611 74 650 50 S710 44 760 18', 'M0 191 C42 187 60 155 103 167 S151 106 198 132 S253 136 295 95 S339 113 380 99 S439 75 478 92 S520 51 557 71 S611 74 650 50 S710 44 760 18 V250 H0 Z'],
    '1Y': ['M0 209 C43 192 70 214 111 175 S166 190 202 145 S259 159 300 118 S365 146 407 105 S465 116 504 87 S552 110 596 61 S684 81 760 27', 'M0 209 C43 192 70 214 111 175 S166 190 202 145 S259 159 300 118 S365 146 407 105 S465 116 504 87 S552 110 596 61 S684 81 760 27 V250 H0 Z']
  };
  line.setAttribute('d', paths[range][0]);
  area.setAttribute('d', paths[range][1]);
  showToast(`已切换至${range === '1D' ? '分时' : range}`);
}));

document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('is-active'));
  button.classList.add('is-active');
  const target = document.getElementById(button.dataset.section);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}));

document.getElementById('refreshBtn').addEventListener('click', () => refreshData(currentProvider));
els.providerSelect.value = currentProvider;
els.providerSelect.addEventListener('change', (event) => refreshData(event.target.value));
document.getElementById('quickScanBtn').addEventListener('click', () => showToast('盘前简报已生成，重点关注消费与新能源'));
document.getElementById('detailAnalysisBtn').addEventListener('click', () => showToast(`正在展开 ${activeStock.name} 的完整分析`));
document.getElementById('addWatchBtn').addEventListener('click', () => { els.watchModal.hidden = false; document.getElementById('newStockInput').focus(); });
document.getElementById('manageWatchBtn').addEventListener('click', () => document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth', block: 'start' }));
document.getElementById('allNewsBtn').addEventListener('click', () => document.getElementById('news').scrollIntoView({ behavior: 'smooth', block: 'start' }));
document.getElementById('portfolioAddBtn').addEventListener('click', () => openPortfolioModal());
document.getElementById('portfolioDetailBtn').addEventListener('click', () => showToast('组合分析：消费与新能源贡献主要收益'));
document.getElementById('calendarBtn').addEventListener('click', () => showToast('事件日历已展开 · 下一个事件为宁德时代三季报'));
const preferences = storage.get(STORAGE_KEYS.preferences, { dense: false, night: false });
document.body.classList.toggle('dense-mode', Boolean(preferences.dense));
document.body.classList.toggle('night-mode', Boolean(preferences.night));
document.getElementById('densityBtn').addEventListener('click', () => { document.body.classList.toggle('dense-mode'); storage.set(STORAGE_KEYS.preferences, { dense: document.body.classList.contains('dense-mode'), night: document.body.classList.contains('night-mode') }); showToast(document.body.classList.contains('dense-mode') ? '已切换为紧凑密度' : '已恢复标准密度'); });
document.getElementById('themeBtn').addEventListener('click', () => { document.body.classList.toggle('night-mode'); storage.set(STORAGE_KEYS.preferences, { dense: document.body.classList.contains('dense-mode'), night: document.body.classList.contains('night-mode') }); showToast(document.body.classList.contains('night-mode') ? '已切换为深色主题' : '已切换为浅色主题'); });

document.getElementById('watchModalSubmit').addEventListener('click', () => {
  const value = document.getElementById('newStockInput').value.trim();
  if (!value) { showToast('请输入股票代码或名称'); return; }
  const known = stocks.find((stock) => stock.code === value || stock.name.includes(value));
  if (known) { els.watchModal.hidden = true; els.search.value = known.code; renderWatchlist(); selectStock(known.code); return; }
  const newStock = { code: value.replace(/\D/g, '').slice(0, 6) || `demo${stocks.length + 1}`, name: value.replace(/\d/g, '') || '新增标的', initial: (value.replace(/\d/g, '') || '新').slice(0, 1), color: 'blue', price: '—', change: '—', trend: 'positive', signal: '待分析', signalType: 'hold', filter: [], score: 60, copy: '已加入自选，等待更多数据', industry: '待分类', amount: 0, turnover: 0, risk: '数据不足', reasons: ['已加入自选列表', '等待行情与公告数据更新', 'AI 暂不做方向性判断'] };
  stocks.push(newStock); persistWorkspace(); els.watchModal.hidden = true; document.getElementById('newStockInput').value = ''; els.search.value = ''; activeMetric = 'all'; document.getElementById('metricFilter').value = 'all'; renderWatchlist(); showToast(`${newStock.name} 已加入自选`);
});

document.getElementById('portfolioModalSubmit').addEventListener('click', () => {
  const codeOrName = document.getElementById('portfolioStockInput').value.trim();
  const qty = Number(document.getElementById('portfolioQtyInput').value);
  const cost = Number(document.getElementById('portfolioCostInput').value);
  const weight = Number(document.getElementById('portfolioWeightInput').value);
  const stock = stocks.find((item) => item.code === codeOrName || item.name.includes(codeOrName));
  if (!codeOrName || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost <= 0 || !Number.isFinite(weight) || weight < 0 || weight > 100) { showToast('请填写有效的标的、股数、成本和 0-100% 仓位'); return; }
  const editIndex = document.getElementById('portfolioModalSubmit').dataset.editIndex;
  const holding = { code: stock ? stock.code : codeOrName, name: stock ? stock.name : codeOrName, qty, cost, weight };
  if (editIndex === '') portfolioHoldings.push(holding); else portfolioHoldings[Number(editIndex)] = holding;
  persistWorkspace(); renderPortfolio(); document.getElementById('portfolioModal').hidden = true; showToast(editIndex === '' ? '持仓已记录' : '持仓已更新');
});

function closeModal() { els.modal.hidden = true; }
document.getElementById('learnMoreBtn').addEventListener('click', () => { els.modal.hidden = false; });
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalDone').addEventListener('click', closeModal);
els.modal.addEventListener('click', (event) => { if (event.target === els.modal) closeModal(); });
function closeNewsModal() { els.newsModal.hidden = true; }
function closeWatchModal() { els.watchModal.hidden = true; document.getElementById('newStockInput').value = ''; }
function closePortfolioModal() { els.portfolioModal.hidden = true; }
document.getElementById('newsModalClose').addEventListener('click', closeNewsModal);
document.getElementById('newsModalDone').addEventListener('click', closeNewsModal);
els.newsModal.addEventListener('click', (event) => { if (event.target === els.newsModal) closeNewsModal(); });
document.getElementById('watchModalClose').addEventListener('click', closeWatchModal);
document.getElementById('watchModalCancel').addEventListener('click', closeWatchModal);
els.watchModal.addEventListener('click', (event) => { if (event.target === els.watchModal) closeWatchModal(); });
document.getElementById('portfolioModalClose').addEventListener('click', closePortfolioModal);
document.getElementById('portfolioModalCancel').addEventListener('click', closePortfolioModal);
els.portfolioModal.addEventListener('click', (event) => { if (event.target === els.portfolioModal) closePortfolioModal(); });
document.querySelectorAll('.metric-card').forEach((card) => card.addEventListener('click', () => showToast(card.dataset.explain)));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeModal(); closeNewsModal(); closeWatchModal(); closePortfolioModal(); } });

renderWatchlist();
renderPortfolio();
setDataStatus(`${providers[currentProvider]?.label || '演示数据'} · ${dataUpdatedAt}`);
