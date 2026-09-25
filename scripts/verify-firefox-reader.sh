#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/third_party/readability"
REVISION="$(tr -d '[:space:]' < "$DEST/UPSTREAM_REVISION")"
BASE="https://raw.githubusercontent.com/mozilla-firefox/firefox/$REVISION/toolkit/components/reader/readability"
TEMP="$(mktemp -d)"
trap 'rm -rf "$TEMP"' EXIT

(cd "$DEST" && sha256sum --check UPSTREAM_SHA256SUMS)

for file in JSDOMParser.js Readability.js LICENSE.md; do
  curl -L --fail --silent --show-error "$BASE/$file" -o "$TEMP/$file"
  if ! cmp --silent "$DEST/$file" "$TEMP/$file"; then
    printf '%s differs from Firefox revision %s\n' "$file" "$REVISION" >&2
    exit 1
  fi
done

printf 'Firefox Reader files match revision %s byte-for-byte.\n' "$REVISION"