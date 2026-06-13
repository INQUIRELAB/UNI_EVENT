"""Bake static web bundles for the Labs from the bundled REAL sample.

    python scripts/make_bundles.py [out_dir]      # default: labs/public/data

Runs each representation through UniEvent and writes one {manifest.json +
payload.bin} bundle per representation. This is the build-time bridge between the
Python library and the static Next.js site — the merge, made literal. Crashes
loudly if the real sample is missing; never falls back to simulated data.
"""
from __future__ import annotations

import sys
from pathlib import Path

import unievent as ue

CORE_REPS = ["spike", "voxel", "frame", "graph"]
STRETCH_REPS = ["timesurface"]


def main(argv: list[str]) -> int:
    out = Path(argv[1]) if len(argv) > 1 else Path("labs/public/data")
    include_stretch = "--stretch" in argv

    stream = ue.sample_stream()  # raises loudly if the real npz is missing
    print(f"[make_bundles] stream : {stream!r}")
    print(f"[make_bundles] out    : {out}")

    reps = CORE_REPS + (STRETCH_REPS if include_stretch else [])
    for rep in reps:
        dest = ue.represent(stream, as_=rep).to_web(out / rep)
        mb = (dest / "payload.bin").stat().st_size / 1e6
        print(f"[make_bundles] {rep:11s} -> {dest}  ({mb:.2f} MB)")

    print(f"[make_bundles] wrote {len(reps)} bundles")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
