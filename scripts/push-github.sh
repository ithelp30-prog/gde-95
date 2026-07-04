#!/usr/bin/env bash
# Публикация «Где 95-й» на GitHub + подсказка по GitHub Pages.
# Использование:  bash scripts/push-github.sh https://github.com/USER/gde-95.git
set -e
URL="${1:?Укажи URL репозитория: bash scripts/push-github.sh https://github.com/USER/gde-95.git}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"

git -C "$DIR" remote remove origin 2>/dev/null || true
git -C "$DIR" remote add origin "$URL"
git -C "$DIR" branch -M main
git -C "$DIR" push -u origin main   # при первом пуше Git Credential Manager откроет браузер-логин

USER_REPO="$(echo "$URL" | sed -E 's#.*github.com[:/]##; s#\.git$##')"
USER="${USER_REPO%%/*}"; REPO="${USER_REPO##*/}"
echo ""
echo "✓ Запушено: $URL"
echo "Дальше включи GitHub Pages (одноразово):"
echo "  1. https://github.com/$USER_REPO/settings/pages"
echo "  2. Source: GitHub Actions  (workflow .github/workflows/pages.yml уже в репо)"
echo "  3. Открой вкладку Actions — дождись зелёного деплоя (~1 мин)"
echo "  4. Приложение будет на: https://$USER.github.io/$REPO/"
echo "  Дальше каждый git push сам передеплоит — данные обновляются автоматически."
echo ""
echo "⚠️ Для обёртки Google Play (TWA) Digital Asset Links должен лежать в КОРНЕ домена:"
echo "   https://$USER.github.io/.well-known/assetlinks.json — это репозиторий $USER.github.io,"
echo "   а не подпапка проекта. См. docs/DEPLOY.md, шаг 4 (для PWA-по-ссылке это не важно)."
