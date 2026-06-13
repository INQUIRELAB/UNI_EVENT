#!/usr/bin/env bash
# UniEvent rubric scorecard. Each line is a real check with a real exit code.
# Usage: LIVE_URL=http://localhost:3000 bash scripts/grade.sh
set -u
cd "$(dirname "$0")/.." || exit 2

PY=${PY:-python}
LIVE_URL=${LIVE_URL:-http://localhost:3000}
pass=0; fail=0
ok()   { echo "  PASS  $1"; pass=$((pass+1)); }
no()   { echo "  FAIL  $1"; fail=$((fail+1)); }

echo "== UniEvent rubric =="

# 1 — install
if $PY -m pip install -e . >/dev/null 2>&1; then ok "1 pip install -e ."; else no "1 pip install -e ."; fi

# 2 — tests
if $PY -m pytest -q >/dev/null 2>&1; then ok "2 pytest -q (0 failures)"; else no "2 pytest -q"; fi

# 3 — four builders match SPEC on one real stream
if $PY -c "
import numpy as np, unievent as ue
s=ue.sample_stream(); assert s.simulated==0
sp=ue.represent(s,as_='spike').buffers
assert sp['t'].dtype==np.int64 and sp['p'].dtype==np.int8
fr=ue.represent(s,as_='frame').buffers['frame']; assert fr.dtype==np.float32 and fr.shape==(s.H,s.W)
vc=ue.represent(s,as_='voxel').buffers; assert vc['coords'].dtype==np.int32 and vc['feats'].shape[1]==2
g=ue.represent(s,as_='graph').buffers; assert g['edges'].dtype==np.int64 and g['edges'].shape[0]==2
" >/dev/null 2>&1; then ok "3 four builders match SPEC"; else no "3 four builders match SPEC"; fi

# 4 — integrity raise
if $PY -c "
import numpy as np, unievent as ue
from unievent import EventSample, UniEventIntegrityError
s=EventSample(kind='voxel',data={'coords':np.zeros((1,3),np.int32),'feats':np.ones((1,2),np.float32)},H=720,W=1280,source={'name':'x','license':'CC0','simulated':0})
try:
    ue.represent(s,as_='spike'); raise SystemExit(1)
except UniEventIntegrityError:
    pass
" >/dev/null 2>&1; then ok "4 spike-from-aggregate RAISES"; else no "4 integrity guard"; fi

# 5 — bundles bake + validate
if $PY scripts/make_bundles.py labs/public/data >/dev/null 2>&1 && \
   $PY scripts/validate_bundles.py labs/public/data >/dev/null 2>&1; then ok "5 bundles schema-conformant"; else no "5 bundles"; fi

# 6 — live site
code=$(curl -s -o /dev/null -w "%{http_code}" -m 8 "$LIVE_URL/health" 2>/dev/null)
[ "$code" = "200" ] || code=$(curl -s -o /dev/null -w "%{http_code}" -m 8 "$LIVE_URL/" 2>/dev/null)
if [ "$code" = "200" ]; then ok "6 live site $LIVE_URL ($code)"; else no "6 live site $LIVE_URL ($code) — start 'make serve' or set LIVE_URL"; fi

# 7 — hero bundle present (reproducible target)
if [ -f labs/public/data/spike/manifest.json ] && [ -f labs/public/data/spike/payload.bin ]; then ok "7 hero bundle reachable"; else no "7 hero bundle"; fi

# 8 — DQ fence
if [ -f CONTRIBUTIONS_TODAY.md ] && grep -q "2026-06-13" CONTRIBUTIONS_TODAY.md; then ok "8 built-today fence"; else no "8 CONTRIBUTIONS_TODAY.md"; fi

echo "== $pass passed, $fail failed =="
[ "$fail" -eq 0 ]
