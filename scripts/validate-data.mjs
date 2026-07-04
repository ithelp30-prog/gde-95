// Валидатор data/cities.json — конвейер зовёт перед публикацией обновления.
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'public', 'data', 'cities.json');
const STATUS = new Set(['ok', 'strained', 'deficit', 'severe']);
const errs = [];

const d = JSON.parse(await readFile(file, 'utf8'));

if (!d.updated || isNaN(new Date(d.updated))) errs.push('updated: нет/битая дата');
if (!d.national || !STATUS.has(d.national.level)) errs.push('national.level неверный');
if (!Array.isArray(d.regions) || !d.regions.length) errs.push('regions пуст');

const ids = new Set();
(d.regions || []).forEach((r, i) => {
  const at = `regions[${i}] (${r.city || r.region || '?'})`;
  if (!r.id) errs.push(`${at}: нет id`);
  else if (ids.has(r.id)) errs.push(`${at}: дубль id "${r.id}"`);
  else ids.add(r.id);
  if (!r.region) errs.push(`${at}: нет region`);
  if (!STATUS.has(r.status)) errs.push(`${at}: status "${r.status}" не из ${[...STATUS]}`);
  if (r.fuels && !Array.isArray(r.fuels)) errs.push(`${at}: fuels не массив`);
  if (r.price_95 != null && typeof r.price_95 !== 'number') errs.push(`${at}: price_95 не число`);
  if (r.sources && !Array.isArray(r.sources)) errs.push(`${at}: sources не массив`);
});

if (errs.length) {
  console.error('❌ Ошибки валидации:\n - ' + errs.join('\n - '));
  process.exit(1);
}
console.log(`✓ OK: ${d.regions.length} регионов, обновлено ${d.updated}`);
