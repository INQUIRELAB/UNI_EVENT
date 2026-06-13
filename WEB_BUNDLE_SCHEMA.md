# Web Bundle Schema (manifest.json + payload.bin)

One representation → one **bundle** = a pair of files the static Labs fetch:

```
labs/public/data/<rep>/
  manifest.json   # contract: dtypes, byte offsets, stats, provenance
  payload.bin     # one flat little-endian binary blob; sliced by byte offset
```

`<rep>` ∈ { `spike`, `frame`, `voxel`, `graph`, `timesurface` }. One JS loader
(`labs/loadUniEvent.js`) reads ANY bundle: parse `manifest.json`, fetch
`payload.bin` once as an `ArrayBuffer`, slice typed-array views by byte
`offset`/`length`. The renderer switches only on `manifest.representation`.

## `manifest.json`

```jsonc
{
  "schema": "unievent/web-bundle@1",
  "representation": "spike",
  "resolution": { "H": 720, "W": 1280 },
  "source": {                         // PROVENANCE — never omit
    "name": "prophesee:pedestrians",
    "license": "CC0",
    "simulated": 0,                   // 0 = real raw events; 1 = teaching/placeholder
    "note": "raw EVT3, decoded with expelliarmus; windowed + decimated for web",
    "window_us": [19780504, 20280504],
    "decimation": { "from": 1732706, "to": 120000, "seed": 0 },
    "source_sha256_64mb": "…"
  },
  "buffers": {                        // each = a typed slice of payload.bin
    "t":     { "dtype": "int32", "shape": [120000],    "offset": 0,      "length": 480000 },
    "coords":{ "dtype": "int16", "shape": [120000, 2], "offset": 480000, "length": 480000 },
    "p":     { "dtype": "int8",  "shape": [120000],    "offset": 960000, "length": 120000 }
  },
  "stats":  { "n_events": 120000, "t_span_us": 499998, "on_frac": 0.53 },
  "caption":"Real raw events — prophesee:pedestrians (CC0). 120,000 spikes, 500 ms, 53% ON."
}
```

### Field rules
- **`offset`/`length` are BYTES.** `length` MUST equal `prod(shape)·bytesPer(dtype)`.
- `dtype` ∈ { `int8`, `int16`, `int32`, `float32` } → `Int8Array / Int16Array / Int32Array / Float32Array`.
- `source.simulated` is the integrity flag. `1` ⇒ the Labs MUST show a
  "SIMULATED — teaching only" badge. The hero bundle is `simulated: 0`.

## `payload.bin` packing (little-endian, tightly packed, in manifest order)

| rep          | buffers (in order)                     | dtypes                       |
|--------------|----------------------------------------|------------------------------|
| `spike`      | `t`, `coords (x,y)`, `p`               | **int32 (zero-based µs)**, int16, int8 |
| `frame`      | `frame (H·W)`                          | float32                      |
| `voxel`      | `coords (t_bin,y,x)`, `feats (off,on)` | int16, float32               |
| `graph`      | `nodes (x,y,t)`, `edges (2,E)`         | float32, int32               |
| `timesurface`| `surface (2·H·W)`                      | float32                      |

> **`t` is int32 ZERO-BASED** (µs since the first event). JS has no int64 view, and
> epoch µs overflows int32 — the library keeps int64 µs; `web.export()` subtracts
> `t[0]` and down-converts. Normalize on screen with `stats.t_span_us`.
>
> **Polarity LOCKED:** voxel `feats` columns are `[off, on]` (channel 0 = OFF, 1 = ON);
> spike/timesurface follow the same convention. Warm `#FF5A3C` = ON, cool `#3CC8FF` = OFF.

## Endianness
`web.export()` writes every buffer little-endian explicitly (`<i4/<i2/<f4`), so
bundles are byte-identical regardless of host. No silent byteswap fallback.
