// Обновление data/cities.json из конвейера.
// Использование:
//   node scripts/update-data.mjs regions.json   — заменить регионы из файла (массив)
//   node scripts/update-data.mjs                 — только переставить метку времени
// Скрипт сам считает national.level (худший статус), ставит свежий updated (МСК)
// и валидирует результат. Ненулевой код выхода = не публиковать.
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'public', 'data', 'cities.json');
const STATUS = ['ok', 'strained', 'deficit', 'severe']; // по возрастанию тяжести
const RANK = Object.fromEntries(STATUS.map((s, i) => [s, i]));

function mskNow() {
  // ISO со смещением +03:00 (Москва)
  const now = new Date(Date.now() + 3 * 3600 * 1000);
  return now.toISOString().replace('Z', '+03:00');
}

const data = JSON.parse(await readFile(file, 'utf8'));

const arg = process.argv[2];
if (arg) {
  const incoming = JSON.parse(await readFile(arg, 'utf8'));
  if (!Array.isArray(incoming)) { console.error('Ожидался массив регионов'); process.exit(1); }
  data.regions = incoming;
}

// national.level = худший статус среди регионов
let worst = 'ok';
for (const r of data.regions || []) {
  if ((RANK[r.status] ?? 0) > (RANK[worst] ?? 0)) worst = r.status;
}
data.national = data.national || {};
data.national.level = worst;

// средние цены АИ-95/92 по регионам, где есть число
const avg = (key) => {
  const xs = (data.regions || []).map(r => r[key]).filter(v => typeof v === 'number');
  return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null;
};
data.national.avg_price_95 = avg('price_95');
data.national.avg_price_92 = avg('price_92');

data.updated = mskNow();
data.schema = 1;

// валидация
const errs = [];
const ids = new Set();
if (!STATUS.includes(data.national.level)) errs.push('national.level');
(data.regions || []).forEach((r, i) => {
  const at = `regions[${i}] (${r.city || r.region || '?'})`;
  if (!r.id) errs.push(`${at}: нет id`);
  else if (ids.has(r.id)) errs.push(`${at}: дубль id ${r.id}`); else ids.add(r.id);
  if (!r.region) errs.push(`${at}: нет region`);
  if (!STATUS.includes(r.status)) errs.push(`${at}: status ${r.status}`);
});
if (!data.regions || !data.regions.length) errs.push('regions пуст');
if (errs.length) { console.error('❌ ' + errs.join('\n❌ ')); process.exit(1); }

await writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`✓ Обновлено: ${data.regions.length} регионов, level=${data.national.level}, updated=${data.updated}`);
