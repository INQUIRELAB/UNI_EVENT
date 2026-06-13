# UniEvent + Labs — PASS/FAIL rubric

`make grade` (→ `scripts/grade.sh`) runs every line below; each is a real command
with a real exit code and prints a scorecard.

| # | Check | PASS condition |
|---|-------|----------------|
| 1 | `pip install -e .` | exit 0 |
| 2 | `pytest -q` | 0 failures |
| 3 | 4 builders on ONE real stream | `represent(stream, as_=r)` for r ∈ {spike, voxel, frame, graph} return SPEC-matching shapes/dtypes |
| 4 | integrity guard | `represent(EventSample, as_="spike")` **RAISES** |
| 5 | bundles schema-conformant | `make_bundles` writes a valid `manifest.json` + `payload.bin` per rep; `validate_bundles.py` re-reads them like the JS loader and passes |
| 6 | live site reachable | `GET <LIVE_URL>/` (or `/health`) == 200 — the static Labs site counts |
| 7 | clean-clone reproduce | `reproduce.sh` regenerates the hero bundle (`labs/public/data/spike/`) from the committed real sample |
| 8 | DQ fence | `CONTRIBUTIONS_TODAY.md` exists and lists today-dated net-new files; license-gate test green |

## Check 3 — SPEC shapes (asserted by `tests/test_represent.py`)
- `spike` → `t int64, x int16, y int16, p int8∈{0,1}`, each `(N,)`.
- `frame` → `(H,W)` float32, signed accumulation.
- `voxel` → `coords (M,3) int32 [t_bin,y,x]` + `feats (M,2) float32 [off,on]`.
- `graph` → `nodes (n,3) float32` + `edges (2,E) int64`, `num_nodes` int.

## Check 4 — the integrity rule
> `spike` requires a raw `EventStream`. `represent(EventSample, as_="spike")`
> RAISES. Events ARE spikes; once aggregated they are gone. (`grade.sh` inverts
> this: PASS means the call DID raise.)

## Check 6 — `<LIVE_URL>`
`LIVE_URL=… bash scripts/grade.sh` (default `http://localhost:3000`). The static
Vercel/Next.js Labs site satisfies it: a 200 on `/health` or on the site root.

## Integrity (audited by eye + by check 4 + license-gate)
- Every visual/number traces to a real `source` provenance block. Hero bundle is
  `simulated: 0`, license CC0.
- Simulated events only as a clearly-labeled teaching aid (`simulated: 1`, badge).
- Real failures crash loudly. No silent fallback from real to simulated.
