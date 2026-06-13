# UniEvent — `represent()` output contracts (SPEC)

Source of truth for the shape / dtype / value-range of every representation.
`web.py`, `WEB_BUNDLE_SCHEMA.md`, the JS loader, and the tests all conform to
THIS file. Numbers below are the **verified** output on the bundled real stream
(`unievent/data/sample_stream.npz`: 120,000 events, 1280×720, 500 ms, 53% ON,
Prophesee pedestrians, CC0).

## Type model (load-bearing)

`represent(obj, as_=...)` dispatches on input type:

| input | `as_="spike"` | voxel / frame / timesurface / graph |
|-------|---------------|-------------------------------------|
| `EventStream` (raw t,x,y,p) | OK — raw stream as SNN-ready spikes | OK |
| `EventSample` (aggregated)  | **RAISES** `UniEventIntegrityError` | re-derive where honest |

### Integrity rule (identical in SPEC.md / rubric.md / README.md)

> `spike` requires a raw `EventStream`. `represent(EventSample, as_="spike")`
> RAISES. You cannot fabricate real per-event spikes from an aggregated
> representation — events ARE spikes, and once aggregated they are gone.

## Core representations (4) — VALIDATED

### `spike` (the hero — SNN-ready)
`Representation.buffers = { t:int64 µs sorted (N,), x:int16 (N,), y:int16 (N,), p:int8∈{0,1} (N,) }`.
Invariants: `t` non-decreasing; `0≤x<W`; `0≤y<H`; `p∈{0,1}`. Verified N=120,000.

### `frame` (signed accumulation)
`buffers = { frame: float32 (H,W) }`. `+1` per ON, `-1` per OFF, summed per pixel.
Clip to `[-3,3]` for display only. Verified `(720,1280)`, observed range `[-9,48]`.

### `voxel` (sparse space-time-polarity grid)
`buffers = { coords: int32 (M,3) [t_bin,y,x], feats: float32 (M,2) [off,on] }`.
`t_bin ∈ [0,bins)`, default `bins=16`. **Channel order LOCKED `[off, on]`**
(channel 0 = OFF/p=0, channel 1 = ON/p=1). FULL temporal structure kept — no
argmax collapse. Verified M=113,011 active voxels.

### `graph` (kNN in normalized x,y,t)
`buffers = { nodes: float32 (n,3) [x,y,t], edges: int64 (2,E) }`; `stats.num_nodes`.
Default `n=1200` (SEEDED subsample), `k=4` on normalized `(x/W, y/H, t/t_span)`.
Verified 1,200 nodes / 4,800 edges.

## Stretch representation (1) — forward-designed

### `timesurface` (exp-decayed time surface)
`buffers = { surface: float32 (2,H,W) }` per polarity, values `exp(-(t_ref-t_last)/tau)`
in `[0,1]`, `tau` default 30,000 µs. Validated by the test-suite on the real
stream; not part of the 4-builder rubric check.

## Notes
- `bins`, `k`, `n`, `tau`, decimation are render/representation choices, stated
  honestly — never as data claims. Every RNG is seeded (reproducible).
- The web bundle down-converts (e.g. spike `t` → int32 zero-based; coords →
  int16) per `WEB_BUNDLE_SCHEMA.md`; the library keeps full precision.
