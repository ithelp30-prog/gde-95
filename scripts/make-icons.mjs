// Генерация PNG-иконок из SVG для PWA/TWA (обычные + maskable).
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'icons');

const drop = (fill) => `
  <path d="M256 96c-70 84-108 140-108 190a108 108 0 0 0 216 0c0-50-38-106-108-190z" fill="${fill}"/>
  <text x="256" y="322" text-anchor="middle"
        font-family="-apple-system, Segoe UI, Roboto, Arial, sans-serif"
        font-size="132" font-weight="800" fill="#0b0d10" letter-spacing="-4">95</text>`;

// Обычная: скруглённый квадрат во весь кадр
const iconSquare = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0b0d10"/>${drop('#ffd23f')}</svg>`;

// Maskable: сплошной фон + контент внутри safe-zone (~72%)
const iconMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0b0d10"/>
  <g transform="translate(72,72) scale(0.72)">${drop('#ffd23f')}</g></svg>`;

async function png(svg, size, name) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(out, name));
  console.log('✓', name);
}

await png(iconSquare, 192, 'icon-192.png');
await png(iconSquare, 512, 'icon-512.png');
await png(iconMaskable, 192, 'icon-maskable-192.png');
await png(iconMaskable, 512, 'icon-maskable-512.png');
// растровый favicon/apple-touch тоже
await png(iconSquare, 180, 'apple-touch-icon.png');
console.log('Готово. Иконки в public/icons/');
