/* Где 95-й — логика приложения. Тянет data/cities.json, кэширует, рисует список. */
(() => {
  'use strict';

  const DATA_URL = 'data/cities.json';
  const CACHE_KEY = 'g95_data_v1';
  const ORDER = { severe: 0, deficit: 1, strained: 2, ok: 3 };
  const LABEL = { ok: 'Норма', strained: 'Перебои', deficit: 'Дефицит', severe: 'Жёсткий' };

  const $ = (s) => document.querySelector(s);
  const listEl = $('#list');
  const heroEl = $('#hero');
  const updatedEl = $('#updated');
  const searchEl = $('#search');
  const offlineEl = $('#offline');

  let DATA = null;
  let filter = 'all';
  let query = '';

  // ---------- theme ----------
  const savedTheme = localStorage.getItem('g95_theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  $('#themeBtn').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('g95_theme', next);
  });

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function fmtPrice(p) {
    if (p == null) return null;
    return Number(p).toFixed(2).replace('.', ',') + ' ₽';
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) +
      ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  // ---------- render ----------
  function renderHero(nat) {
    if (!nat) { heroEl.innerHTML = ''; return; }
    const lvl = nat.level || 'strained';
    const stats = [];
    if (nat.avg_price_95 != null) stats.push({ k: 'АИ-95, средняя', v: fmtPrice(nat.avg_price_95) });
    if (nat.avg_price_92 != null) stats.push({ k: 'АИ-92, средняя', v: fmtPrice(nat.avg_price_92) });
    const trendCls = nat.trend === 'up' ? 'trend-up' : nat.trend === 'down' ? 'trend-down' : '';
    const trendSym = nat.trend === 'up' ? ' ▲' : nat.trend === 'down' ? ' ▼' : '';
    heroEl.innerHTML = `
      <div class="hero-level b-${esc(lvl)}">
        <span class="hero-badge card-badge">${esc(LABEL[lvl] || lvl)}</span>
      </div>
      <div class="hero-headline">${esc(nat.headline || '')}</div>
      ${stats.length ? `<div class="hero-stats">${stats.map(s =>
        `<div class="hero-stat"><div class="k">${esc(s.k)}</div>
         <div class="v ${trendCls}">${esc(s.v)}${trendSym}</div></div>`).join('')}</div>` : ''}
    `;
  }

  function cardHTML(r) {
    const st = r.status || 'strained';
    const fuels = (r.fuels || []).map(f => `<span class="tag fuel">${esc(f)}</span>`).join('');
    const price = fmtPrice(r.price_95);
    const priceTag = price ? `<span class="tag price">АИ-95 · ${esc(price)}</span>` : '';
    const limitTag = r.limit ? `<span class="tag">${esc(r.limit)}</span>` : '';
    const note = r.note ? `<div class="card-note">${esc(r.note)}</div>` : '';
    const src = (r.sources && r.sources[0])
      ? `<div class="card-src">Источник: <a href="${esc(r.sources[0].url)}" target="_blank" rel="noopener">${esc(r.sources[0].title || 'ссылка')}</a></div>`
      : '';
    return `
      <article class="card b-${esc(st)}">
        <div class="card-bar s-${esc(st)}"></div>
        <div class="card-body">
          <div class="card-top">
            <div>
              <div class="card-city">${esc(r.city || r.region)}</div>
              <div class="card-region">${esc(r.region || '')}</div>
            </div>
            <span class="card-badge">${esc(LABEL[st] || st)}</span>
          </div>
          <div class="card-meta">${fuels}${priceTag}${limitTag}</div>
          ${note}${src}
        </div>
      </article>`;
  }

  function render() {
    if (!DATA) return;
    renderHero(DATA.national);
    updatedEl.textContent = DATA.updated ? 'обновлено ' + fmtDate(DATA.updated) : '';

    let rows = (DATA.regions || []).slice();
    if (filter !== 'all') rows = rows.filter(r => r.status === filter);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter(r =>
        (r.city || '').toLowerCase().includes(q) ||
        (r.region || '').toLowerCase().includes(q));
    }
    rows.sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) ||
      (a.region || '').localeCompare(b.region || '', 'ru'));

    listEl.innerHTML = rows.length
      ? rows.map(cardHTML).join('')
      : `<div class="empty">Ничего не найдено.<br>Попробуйте другой запрос.</div>`;
  }

  // ---------- data ----------
  function applyData(d, fromCache) {
    DATA = d;
    try { if (!fromCache) localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) {}
    render();
  }

  async function loadData() {
    // мгновенно показываем кэш, затем обновляем из сети (stale-while-revalidate)
    let hadCache = false;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) { applyData(JSON.parse(cached), true); hadCache = true; }
    } catch (e) {}

    try {
      const res = await fetch(DATA_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      applyData(d, false);
      offlineEl.classList.add('hidden');
    } catch (e) {
      if (!hadCache) {
        listEl.innerHTML = `<div class="empty">Не удалось загрузить данные.<br>Проверьте соединение.</div>`;
      }
      offlineEl.classList.toggle('hidden', !hadCache);
    }
  }

  // ---------- events ----------
  $('#filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
    btn.classList.add('is-active');
    filter = btn.dataset.filter;
    render();
  });

  let t;
  searchEl.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { query = searchEl.value.trim(); render(); }, 120);
  });

  window.addEventListener('online', loadData);
  window.addEventListener('offline', () => offlineEl.classList.toggle('hidden', !DATA));

  // ---------- boot ----------
  loadData();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
