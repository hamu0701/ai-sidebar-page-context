#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REVISION="${1:-main}"
API="https://api.github.com/repos/mozilla-firefox/firefox/commits/$REVISION"

if [[ "$REVISION" == "main" ]]; then
  REVISION="$(curl -L --fail --silent --show-error "$API" | jq -r .sha)"
fi

BASE="https://raw.githubusercontent.com/mozilla-firefox/firefox/$REVISION/toolkit/components/reader/readability"
DEST="$ROOT/third_party/readability"
TEMP="$(mktemp -d)"
trap 'rm -rf "$TEMP"' EXIT

for file in JSDOMParser.js Readability.js LICENSE.md; do
  curl -L --fail --silent --show-error "$BASE/$file" -o "$TEMP/$file"
done

printf '%s\n' "$REVISION" > "$TEMP/UPSTREAM_REVISION"
(cd "$TEMP" && \
  sha256sum JSDOMParser.js Readability.js LICENSE.md > UPSTREAM_SHA256SUMS)

for file in \
  JSDOMParser.js \
  Readability.js \
  LICENSE.md \
  UPSTREAM_REVISION \
  UPSTREAM_SHA256SUMS; do
  mv "$TEMP/$file" "$DEST/$file"
done

printf 'Updated Firefox Reader dependencies to %s\n' "$REVISION"