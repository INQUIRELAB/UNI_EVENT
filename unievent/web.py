"""``web.export`` — bake a :class:`Representation` into a static web bundle.

One representation -> ``out_dir/{manifest.json, payload.bin}``, exactly the
contract the Labs' single JS loader consumes (WEB_BUNDLE_SCHEMA.md). The Labs
ship these as plain files: zero backend on stage.

Key down-conversions for the browser (JS has no int64 view):
  * spike  ``t`` -> int32 **zero-based** (µs since first event)
  * coords -> int16 (sensor <= 1280 fits); feats/frame/surface -> float32; edges -> int32

All buffers are written **little-endian** explicitly, so bundles are byte-identical
regardless of host endianness — no silent fallback, and BE hosts still emit LE.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from .representations.base import Representation

SCHEMA_VERSION = "unievent/web-bundle@1"

# host-independent dtype name from a numpy dtype (kind, itemsize)
_DTYPE_NAME = {
    ("i", 1): "int8",
    ("i", 2): "int16",
    ("i", 4): "int32",
    ("f", 4): "float32",
}


def _name(dt: np.dtype) -> str:
    key = (dt.kind, dt.itemsize)
    if key not in _DTYPE_NAME:
        raise ValueError(f"web bundle: unsupported dtype {dt!r} (kind={dt.kind}, size={dt.itemsize})")
    return _DTYPE_NAME[key]


def _pack(rep: Representation) -> list[tuple[str, np.ndarray]]:
    """Ordered (name, little-endian array) pairs for ``rep``'s payload.bin."""
    b = rep.buffers
    k = rep.kind
    if k == "spike":
        t = np.asarray(b["t"], dtype=np.int64)
        t0 = int(t[0]) if t.size else 0
        return [
            ("t", (t - t0).astype("<i4")),  # int32 zero-based µs
            ("coords", np.stack([b["x"], b["y"]], axis=1).astype("<i2")),  # (N,2) [x,y]
            ("p", np.asarray(b["p"]).astype("<i1")),
        ]
    if k == "frame":
        return [("frame", np.asarray(b["frame"]).astype("<f4"))]
    if k == "voxel":
        return [
            ("coords", np.asarray(b["coords"]).astype("<i2")),  # (M,3) [t_bin,y,x]
            ("feats", np.asarray(b["feats"]).astype("<f4")),  # (M,2) [off,on]
        ]
    if k == "graph":
        return [
            ("nodes", np.asarray(b["nodes"]).astype("<f4")),  # (N,3) [x,y,t]
            ("edges", np.asarray(b["edges"]).astype("<i4")),  # (2,E)
        ]
    if k == "timesurface":
        return [("surface", np.asarray(b["surface"]).astype("<f4"))]
    raise ValueError(f"web bundle: no packing rule for representation {k!r}")


def _caption(rep: Representation) -> str:
    src = rep.source or {}
    name = src.get("name", "unknown")
    lic = src.get("license", "UNKNOWN")
    sim = " · SIMULATED — teaching only" if int(src.get("simulated", 1)) else ""
    s = rep.stats or {}
    head = f"Real raw events — {name} ({lic})." if not sim else f"{name} ({lic})"
    if rep.kind == "spike":
        ms = s.get("t_span_us", 0) / 1000
        return f"{head} {s.get('n_events', 0):,} spikes, {ms:.0f} ms, {s.get('on_frac', 0):.0%} ON.{sim}"
    if rep.kind == "frame":
        return f"{head} Signed accumulation of {s.get('n_events', 0):,} events.{sim}"
    if rep.kind == "voxel":
        return f"{head} {s.get('n_voxels', 0):,} active voxels, {s.get('bins', 0)} time bins.{sim}"
    if rep.kind == "graph":
        return f"{head} {s.get('num_nodes', 0):,} nodes, {s.get('num_edges', 0):,} kNN edges.{sim}"
    if rep.kind == "timesurface":
        return f"{head} Exp-decay time surface (tau={s.get('tau_us', 0)/1000:.0f} ms).{sim}"
    return head + sim


def export(rep: Representation, out_dir) -> Path:
    """Write ``rep`` to ``out_dir/{manifest.json, payload.bin}`` and return the dir."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    manifest_buffers: dict[str, dict] = {}
    parts: list[bytes] = []
    offset = 0
    for name, arr in _pack(rep):
        arr = np.ascontiguousarray(arr)
        raw = arr.tobytes()
        elements = int(np.prod(arr.shape)) if arr.shape else 1
        expected = elements * arr.dtype.itemsize
        if len(raw) != expected:  # guard: bytes must match shape*dtype exactly
            raise AssertionError(f"buffer {name!r}: {len(raw)}B != {expected}B from shape/dtype")
        manifest_buffers[name] = {
            "dtype": _name(arr.dtype),
            "shape": [int(s) for s in arr.shape],
            "offset": offset,
            "length": len(raw),
        }
        parts.append(raw)
        offset += len(raw)

    payload = b"".join(parts)

    manifest = {
        "schema": SCHEMA_VERSION,
        "representation": rep.kind,
        "resolution": {"H": int(rep.H), "W": int(rep.W)},
        "source": rep.source,
        "buffers": manifest_buffers,
        "stats": rep.stats,
        "params": rep.params,
        "caption": _caption(rep),
        "payload_bytes": len(payload),
    }

    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (out / "payload.bin").write_bytes(payload)
    return out
