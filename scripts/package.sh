#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/manifest.json').version")"
OUT_DIR="$ROOT/web-ext-artifacts"
XPI="$OUT_DIR/ai-sidebar-page-context-$VERSION.xpi"
SOURCE="$OUT_DIR/ai-sidebar-page-context-$VERSION-source.zip"

mkdir -p "$OUT_DIR"
rm -f "$XPI" "$SOURCE"
cd "$ROOT"
zip -q -r "$XPI" \
  manifest.json \
  LICENSE \
  THIRD_PARTY_NOTICES.md \
  icons \
  src \
  third_party

SOURCE_FILES=(
  .editorconfig
  .gitignore
  .prettierignore
  .prettierrc.json
  manifest.json
  package.json
  package-lock.json
  eslint.config.mjs
  LICENSE
  THIRD_PARTY_NOTICES.md
  icons
  scripts
  src
  tests
  third_party
)

for optional in README.md PRIVACY.md; do
  if [[ -e "$optional" ]]; then
    SOURCE_FILES+=("$optional")
  fi
done

zip -q -r "$SOURCE" "${SOURCE_FILES[@]}"

unzip -t "$XPI" >/dev/null
unzip -t "$SOURCE" >/dev/null

if unzip -Z1 "$XPI" | grep -Eq \
  '^(docs/|options/|scripts/|tests/|package(-lock)?\.json$)'; then
  printf 'XPI contains development-only files\n' >&2
  exit 1
fi

printf '%s\n%s\n' "$XPI" "$SOURCE"