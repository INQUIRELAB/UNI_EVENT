#!/usr/bin/env bash
# Clean-clone reproduction: from a fresh checkout, install the library and
# regenerate the hero bundle from the committed REAL sample (proves the merge).
set -euo pipefail
cd "$(dirname "$0")/.." || exit 2
PY=${PY:-python}

echo "[reproduce] installing unievent (+io,dev) ..."
$PY -m pip install -e ".[io,dev]" >/dev/null

echo "[reproduce] baking bundles from the committed real sample ..."
$PY scripts/make_bundles.py labs/public/data

echo "[reproduce] validating bundles (re-read like the JS loader) ..."
$PY scripts/validate_bundles.py labs/public/data

test -f labs/public/data/spike/manifest.json
test -f labs/public/data/spike/payload.bin
echo "[reproduce] OK — hero bundle at labs/public/data/spike/"
