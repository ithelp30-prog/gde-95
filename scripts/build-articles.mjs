// Генератор AI-SEO страниц-ответов для «Широков AI».
// Делает: (1) флагман — статью о дефиците бензина ИЗ public/data/cities.json
// (обновляется вместе с данными), (2) страницы из content/posts/*.json,
// (3) индекс статей, (4) sitemap.xml, (5) llms.txt, (6) robots.txt.
// Всё — статический семантический HTML + schema.org (Article/FAQPage/Dataset).
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const BASE = 'https://ithelp30-prog.github.io/gde-95/public';
const CHANNEL = 'https://t.me/top_comp';
const BRAND = 'Широков AI';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// --- крошечный markdown -> html (заголовки, абзацы, списки, жирный, ссылки) ---
function md(src) {
  const lines = String(src || '').split(/\r?\n/);
  let html = '', list = false;
  const inline = (t) => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const closeList = () => { if (list) { html += '</ul>'; list = false; } };
  for (const ln of lines) {
    const t = ln.trim();
    if (!t) { closeList(); continue; }
    let m;
    if ((m = t.match(/^###\s+(.*)/))) { closeList(); html += `<h3>${inline(m[1])}</h3>`; }
    else if ((m = t.match(/^##\s+(.*)/))) { closeList(); html += `<h2>${inline(m[1])}</h2>`; }
    else if ((m = t.match(/^#\s+(.*)/))) { closeList(); html += `<h2>${inline(m[1])}</h2>`; }
    else if ((m = t.match(/^[-*]\s+(.*)/))) { if (!list) { html += '<ul>'; list = true; } html += `<li>${inline(m[1])}</li>`; }
    else { closeList(); html += `<p>${inline(t)}</p>`; }
  }
  closeList();
  return html;
}

const STATUS_LABEL = { ok: 'Норма', strained: 'Перебои', deficit: 'Дефицит', severe: 'Жёсткий дефицит' };
const STATUS_RANK = { severe: 0, deficit: 1, strained: 2, ok: 3 };

function fmtDateHuman(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// --- обёртка страницы ---
function page({ title, description, canonical, bodyHtml, jsonld, updated }) {
  const ld = jsonld.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
${updated ? `<meta name="last-modified" content="${esc(updated)}">` : ''}
<link rel="stylesheet" href="${BASE}/articles/article.css">
${ld}
</head>
<body>
<header class="top">
  <a class="brand" href="${BASE}/">⛽ Где 95-й</a>
  <a class="chan" href="${CHANNEL}" target="_blank" rel="noopener">Канал «${esc(BRAND)}»</a>
</header>
<main class="wrap">
${bodyHtml}
</main>
<footer class="foot">
  <p>Материал канала <a href="${CHANNEL}" target="_blank" rel="noopener">«${esc(BRAND)}»</a>.
  Данные из открытых источников. ${updated ? 'Обновлено: ' + esc(fmtDateHuman(updated)) + '.' : ''}</p>
  <p><a href="${BASE}/">Открыть приложение «Где 95-й»</a> · <a href="${BASE}/articles/">Все материалы</a></p>
</footer>
</body>
</html>`;
}

// --- флагман: статья о дефиците бензина из cities.json ---
function fuelArticle(data) {
  const regions = (data.regions || []).slice()
    .sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9)
      || (a.region || '').localeCompare(b.region || '', 'ru'));
  const updated = data.updated;
  const total = regions.length;
  const severe = regions.filter(r => r.status === 'severe');
  const deficit = regions.filter(r => r.status === 'deficit');
  const worst = regions.find(r => r.limit && /\d/.test(r.limit)) || regions[0];

  const title = 'Где сейчас дефицит бензина в России: список регионов и лимиты на АЗС';
  const description = `Актуальный список регионов России с дефицитом бензина (АИ-92, АИ-95): перебои на АЗС, лимиты на заправку, цены. Обновлено ${fmtDateHuman(updated)}.`;
  const canonical = `${BASE}/articles/deficit-benzina-rossiya/`;

  // прямой ответ (40–60 слов)
  const lead = `<p class="lead"><strong>Коротко:</strong> по открытым данным, дефицит бензина в России затрагивает уже большинство регионов. В списке ниже — ${total} субъект(ов) с перебоями, из них ${severe.length} с жёстким дефицитом и ${deficit.length} с дефицитом. Во многих введены лимиты на отпуск топлива на АЗС${worst && worst.limit ? ` (самый строгий — ${esc(worst.region)}: ${esc(worst.limit)})` : ''}. Данные обновлены ${fmtDateHuman(updated)}.</p>`;

  // таблица регионов
  const rows = regions.map(r => {
    const src = (r.sources && r.sources[0]) ? `<a href="${esc(r.sources[0].url)}" target="_blank" rel="noopener">${esc(r.sources[0].title || 'источник')}</a>` : '—';
    return `<tr>
      <td>${esc(r.region)}${r.city && r.city !== r.region ? `<br><span class="muted">${esc(r.city)}</span>` : ''}</td>
      <td><span class="badge b-${esc(r.status)}">${esc(STATUS_LABEL[r.status] || r.status)}</span></td>
      <td>${esc((r.fuels || []).join(', ') || '—')}</td>
      <td>${esc(r.limit || '—')}</td>
      <td>${src}</td>
    </tr>`;
  }).join('\n');

  const table = `<div class="tablewrap"><table>
    <thead><tr><th>Регион</th><th>Статус</th><th>Дефицит</th><th>Лимит на АЗС</th><th>Источник</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;

  // FAQ
  const faqs = [
    { q: 'В каких регионах России сейчас дефицит бензина?',
      a: `Перебои и дефицит зафиксированы в ${total} регионах. Жёсткий дефицит — ${severe.map(r => r.region).join(', ') || '—'}. Полный список с лимитами и источниками — в таблице выше. Данные обновлены ${fmtDateHuman(updated)}.` },
    { q: 'Какие лимиты на заправку ввели на АЗС?',
      a: `Лимиты различаются по регионам: от 15 до 40 литров в одни руки. Например: ${regions.filter(r => r.limit && /\d/.test(r.limit)).slice(0, 4).map(r => `${r.region} — ${r.limit}`).join('; ') || 'см. таблицу'}.` },
    { q: 'Где самый строгий лимит на бензин?',
      a: worst && worst.limit ? `Самый строгий известный лимит — в регионе ${worst.region}: ${worst.limit}. Подробности и источник — в таблице.` : 'См. актуальную таблицу лимитов выше.' },
    { q: 'Почему в России пропал бензин?',
      a: 'Основные причины по открытым данным — снижение объёмов нефтепереработки (ремонты и остановки НПЗ), логистические ограничения и экспортные факторы. Ситуация меняется, страница обновляется по мере поступления данных.' },
  ];
  const faqHtml = `<section><h2>Частые вопросы</h2>${faqs.map(f =>
    `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('\n')}</section>`;

  const sources = [];
  const seen = new Set();
  for (const r of regions) for (const s of (r.sources || [])) {
    if (s.url && !seen.has(s.url)) { seen.add(s.url); sources.push(s); }
  }
  const srcHtml = sources.length ? `<section><h2>Источники</h2><ul>${sources.map(s =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a></li>`).join('')}</ul></section>` : '';

  const body = `<article>
    <h1>${esc(title)}</h1>
    <p class="meta">Обновлено: <time datetime="${esc(updated)}">${esc(fmtDateHuman(updated))}</time> · Источник: канал <a href="${CHANNEL}" target="_blank" rel="noopener">«${esc(BRAND)}»</a></p>
    ${lead}
    <section><h2>Регионы с дефицитом бензина — таблица</h2>${table}</section>
    ${faqHtml}
    ${srcHtml}
  </article>`;

  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: title, description,
      inLanguage: 'ru-RU', datePublished: updated, dateModified: updated,
      author: { '@type': 'Organization', name: BRAND, url: CHANNEL },
      publisher: { '@type': 'Organization', name: BRAND, url: CHANNEL },
      mainEntityOfPage: canonical },
    { '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    { '@context': 'https://schema.org', '@type': 'Dataset', name: 'Дефицит бензина по регионам России',
      description: 'Статусы дефицита бензина (АИ-92/АИ-95), лимиты на АЗС и источники по регионам РФ.',
      inLanguage: 'ru-RU', dateModified: updated, creator: { '@type': 'Organization', name: BRAND },
      distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${BASE}/data/cities.json` }] },
  ];

  return { slug: 'deficit-benzina-rossiya', title, description, canonical, updated,
    html: page({ title, description, canonical, bodyHtml: body, jsonld, updated }) };
}

// --- страница из поста (content/posts/*.json) ---
function postArticle(p) {
  const slug = p.slug;
  const canonical = `${BASE}/articles/${slug}/`;
  const updated = p.updated || p.date;
  const title = p.title;
  const description = p.description || (p.lead || '').slice(0, 160);
  const srcHtml = (p.sources && p.sources.length) ? `<section><h2>Источники</h2><ul>${p.sources.map(s =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a></li>`).join('')}</ul></section>` : '';
  const body = `<article>
    <h1>${esc(title)}</h1>
    <p class="meta">${p.date ? 'Опубликовано: ' + esc(fmtDateHuman(p.date)) : ''}${updated && updated !== p.date ? ' · Обновлено: ' + esc(fmtDateHuman(updated)) : ''} · <a href="${CHANNEL}" target="_blank" rel="noopener">«${esc(BRAND)}»</a></p>
    ${p.lead ? `<p class="lead">${esc(p.lead)}</p>` : ''}
    ${md(p.body || '')}
    ${srcHtml}
  </article>`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: title, description,
      inLanguage: 'ru-RU', datePublished: p.date, dateModified: updated,
      author: { '@type': 'Organization', name: BRAND, url: CHANNEL },
      publisher: { '@type': 'Organization', name: BRAND, url: CHANNEL }, mainEntityOfPage: canonical },
  ];
  return { slug, title, description, canonical, updated,
    html: page({ title, description, canonical, bodyHtml: body, jsonld, updated }) };
}

async function loadPosts() {
  const dir = join(root, 'content', 'posts');
  try {
    const files = (await readdir(dir)).filter(f => f.endsWith('.json'));
    const out = [];
    for (const f of files) {
      try { const p = JSON.parse(await readFile(join(dir, f), 'utf8')); if (p.slug && p.title) out.push(p); }
      catch (e) { console.warn('пропущен пост', f, e.message); }
    }
    return out;
  } catch { return []; }
}

async function write(slug, html) {
  const dir = join(pub, 'articles', slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), html, 'utf8');
}

async function main() {
  const data = JSON.parse(await readFile(join(pub, 'data', 'cities.json'), 'utf8'));
  const arts = [];
  arts.push(fuelArticle(data));
  for (const p of await loadPosts()) arts.push(postArticle(p));

  for (const a of arts) await write(a.slug, a.html);

  // индекс статей
  arts.sort((a, b) => new Date(b.updated) - new Date(a.updated));
  const items = arts.map(a => `<li><a href="${a.canonical}">${esc(a.title)}</a>
    <span class="muted"> — обновлено ${esc(fmtDateHuman(a.updated))}</span></li>`).join('\n');
  const idxBody = `<article><h1>Материалы «${esc(BRAND)}»</h1>
    <p class="lead">Факты и разборы по дефициту топлива и не только. Обновляется автоматически.</p>
    <ul class="list">${items}</ul></article>`;
  const idxHtml = page({ title: `Материалы «${BRAND}»`, description: 'Статьи и данные канала «Широков AI»: дефицит бензина по регионам России и другое.',
    canonical: `${BASE}/articles/`, bodyHtml: idxBody,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Материалы «${BRAND}»`, inLanguage: 'ru-RU' }],
    updated: arts[0]?.updated });
  await mkdir(join(pub, 'articles'), { recursive: true });
  await writeFile(join(pub, 'articles', 'index.html'), idxHtml, 'utf8');

  // sitemap.xml
  const urls = [`${BASE}/`, `${BASE}/articles/`, ...arts.map(a => a.canonical)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${esc(u)}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`).join('\n')}
</urlset>`;
  await writeFile(join(pub, 'sitemap.xml'), sitemap, 'utf8');

  // robots.txt — разрешаем ИИ-ботов, указываем sitemap
  const robots = `User-agent: *
Allow: /

# ИИ-поисковики и ассистенты — разрешены (иначе не смогут цитировать)
User-agent: GPTBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Bingbot
Allow: /
User-agent: YandexBot
Allow: /

Sitemap: ${BASE}/sitemap.xml
`;
  await writeFile(join(pub, 'robots.txt'), robots, 'utf8');

  // llms.txt — краткий контекст для ИИ (llmstxt.org)
  const llms = `# ${BRAND} — Где 95-й

> Приложение и материалы о дефиците бензина в регионах России: где перебои с АИ-92 и АИ-95, лимиты на АЗС, цены. Данные из открытых источников, обновляются ежедневно. Проект канала «${BRAND}».

## Основные страницы
- [Приложение «Где 95-й»](${BASE}/): живой трекер дефицита бензина по регионам РФ.
- [Где сейчас дефицит бензина в России](${BASE}/articles/deficit-benzina-rossiya/): актуальный список регионов, лимиты на АЗС, источники.
- [Все материалы](${BASE}/articles/): статьи и данные канала.
- [Данные (JSON)](${BASE}/data/cities.json): машиночитаемый датасет по регионам.

## Канал
- Telegram: ${CHANNEL}
`;
  await writeFile(join(pub, 'llms.txt'), llms, 'utf8');

  console.log(`✓ Собрано статей: ${arts.length}; индекс, sitemap.xml, robots.txt, llms.txt обновлены.`);
}

main().catch(e => { console.error('build-articles:', e); process.exit(1); });
