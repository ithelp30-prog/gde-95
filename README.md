# Где 95-й

Мобильное приложение-трекер дефицита бензина в городах России. PWA + обёртка TWA
для публикации в Google Play. Данные обновляются конвейером «Широков AI» — приложение
всегда показывает свежую картину **без переустановки** и без ревью Google.

## Что внутри

```
public/                 ← само приложение (то, что хостится)
  index.html            ← экран
  styles.css            ← минималистичный дизайн (тёмная/светлая тема)
  app.js                ← логика: тянет data/cities.json, кэш, фильтры, поиск
  sw.js                 ← service worker (офлайн + свежие данные)
  manifest.webmanifest  ← PWA-манифест
  icons/                ← иконки (SVG + PNG 192/512 + maskable)
  data/cities.json      ← ДАННЫЕ: регионы, статусы, лимиты, цены, источники
  .well-known/assetlinks.json ← связка сайта и Android-приложения (для TWA)
scripts/
  make-icons.mjs        ← генерация PNG-иконок из SVG   (npm run icons)
  serve.mjs             ← локальный превью-сервер        (npm run serve)
  update-data.mjs       ← обновление данных из конвейера
  validate-data.mjs     ← валидатор cities.json          (npm run validate)
twa/twa-manifest.json   ← конфиг Bubblewrap для сборки .aab
docs/DEPLOY.md          ← пошаговая инструкция: хостинг + Google Play
```

## Локальный запуск

```bash
npm install
npm run icons        # один раз — сгенерировать PNG-иконки
npm run serve        # http://localhost:8799
```

## Обновление данных (главное)

Статусы городов лежат в `public/data/cities.json`. Конвейер обновляет их так:

```bash
# положить свежий массив регионов в regions.json и:
node scripts/update-data.mjs regions.json
# скрипт сам посчитает общероссийский уровень, средние цены,
# поставит метку времени (МСК) и провалидирует. Ненулевой код = не публиковать.
git commit -am "data" && git push   # при хостинге на GitHub Pages — уходит в прод
```

Модель статусов: `ok` (норма) · `strained` (перебои) · `deficit` (дефицит) ·
`severe` (жёсткий дефицит). Поле `verified` отмечает перекрёстно проверенные факты.

## Публикация в Google Play

См. **docs/DEPLOY.md**. Коротко: захостить `public/` на HTTPS-домене → положить
`assetlinks.json` → собрать `.aab` через Bubblewrap → загрузить в Play Console.
