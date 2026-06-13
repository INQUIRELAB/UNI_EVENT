"""Validate baked web bundles by re-reading them EXACTLY like the JS loader.

    python scripts/validate_bundles.py [data_dir]    # default: labs/public/data

Doubles as orchestration evidence: it independently re-parses every bundle the
same way ``labs/loadUniEvent.js`` does (slice payload.bin by byte offset; assert
``length == prod(shape) * bytesPer``; dtype in the allowed set), then asserts the
per-representation value ranges and the schema/provenance fields. Exits non-zero
on any failure — no silent pass.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

VIEWS = {"int8": np.int8, "int16": np.int16, "int32": np.int32, "float32": np.float32}
BYTES = {"int8": 1, "int16": 2, "int32": 4, "float32": 4}


def load_bundle(d: Path):
    manifest = json.loads((d / "manifest.json").read_text(encoding="utf-8"))
    raw = (d / "payload.bin").read_bytes()
    buffers = {}
    for name, spec in manifest["buffers"].items():
        dt = spec["dtype"]
        if dt not in VIEWS:
            raise AssertionError(f"{d.name}/{name}: bad dtype {dt!r}")
        elems = int(np.prod(spec["shape"])) if spec["shape"] else 1
        assert spec["length"] == elems * BYTES[dt], f"{d.name}/{name}: length != shape*bytes"
        assert spec["offset"] + spec["length"] <= len(raw), f"{d.name}/{name}: slice out of range"
        sl = raw[spec["offset"]: spec["offset"] + spec["length"]]
        buffers[name] = np.frombuffer(sl, dtype=VIEWS[dt]).reshape(spec["shape"])
    return manifest, buffers


def _check_common(d: Path, m: dict):
    assert m["schema"] == "unievent/web-bundle@1", f"{d.name}: bad schema"
    src = m.get("source", {})
    for key in ("name", "license", "simulated"):
        assert key in src, f"{d.name}: source.{key} missing (provenance is mandatory)"
    assert src["simulated"] in (0, 1), f"{d.name}: simulated must be 0/1"
    return src


def validate(d: Path) -> str:
    m, b = load_bundle(d)
    rep = m["representation"]
    H, W = m["resolution"]["H"], m["resolution"]["W"]
    src = _check_common(d, m)

    if rep == "spike":
        t, coords, p = b["t"], b["coords"], b["p"]
        assert t.dtype == np.int32 and coords.dtype == np.int16 and p.dtype == np.int8
        assert np.all(np.diff(t) >= 0), "spike t not sorted"
        assert int(t[0]) == 0, "spike t must be zero-based for the web"
        assert coords[:, 0].min() >= 0 and coords[:, 0].max() < W, "x out of range"
        assert coords[:, 1].min() >= 0 and coords[:, 1].max() < H, "y out of range"
        assert set(np.unique(p).tolist()) <= {0, 1}, "p not in {0,1}"
        detail = f"{len(t):,} spikes, {(int(t[-1])/1000):.0f}ms, {p.mean():.0%} ON"
    elif rep == "frame":
        fr = b["frame"]
        assert fr.dtype == np.float32 and fr.shape == (H, W), "frame shape/dtype"
        detail = f"{fr.shape} range [{fr.min():.0f},{fr.max():.0f}], {(fr != 0).sum():,} nonzero px"
    elif rep == "voxel":
        coords, feats = b["coords"], b["feats"]
        assert coords.dtype == np.int16 and feats.dtype == np.float32
        assert coords.shape[1] == 3 and feats.shape[1] == 2, "voxel coords(M,3)/feats(M,2)"
        assert coords[:, 0].min() >= 0, "t_bin negative"
        assert coords[:, 1].max() < H and coords[:, 2].max() < W, "voxel y/x out of range"
        assert (feats >= 0).all(), "voxel feats negative"
        detail = f"{coords.shape[0]:,} voxels, {int(coords[:,0].max())+1} bins, feats[off,on]"
    elif rep == "graph":
        nodes, edges = b["nodes"], b["edges"]
        assert nodes.dtype == np.float32 and edges.dtype == np.int32
        assert nodes.shape[1] == 3 and edges.shape[0] == 2, "graph nodes(N,3)/edges(2,E)"
        n = nodes.shape[0]
        assert edges.min() >= 0 and edges.max() < n, "edge index out of range"
        detail = f"{n:,} nodes, {edges.shape[1]:,} edges"
    elif rep == "timesurface":
        s = b["surface"]
        assert s.dtype == np.float32, "surface dtype"
        assert 0.0 <= float(s.min()) and float(s.max()) <= 1.0 + 1e-5, "surface not in [0,1]"
        detail = f"{s.shape}, max {s.max():.3f}"
    else:
        raise AssertionError(f"{d.name}: unknown representation {rep!r}")

    size_mb = (d / "payload.bin").stat().st_size / 1e6
    return f"  PASS  {rep:11s} simulated={src['simulated']} [{src['license']}]  {detail}  ({size_mb:.2f} MB)"


def main(argv: list[str]) -> int:
    data_dir = Path(argv[1]) if len(argv) > 1 else Path("labs/public/data")
    dirs = sorted(p.parent for p in data_dir.glob("*/manifest.json"))
    if not dirs:
        print(f"[validate] no bundles under {data_dir}")
        return 1
    print(f"[validate] {len(dirs)} bundles under {data_dir}")
    ok = True
    for d in dirs:
        try:
            print(validate(d))
        except Exception as exc:  # noqa: BLE001 - report and fail
            print(f"  FAIL  {d.name}: {exc}")
            ok = False
    print("[validate] ALL CHECKS PASSED" if ok else "[validate] FAILURES ABOVE")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
