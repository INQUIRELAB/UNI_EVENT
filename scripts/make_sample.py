"""Build the bundled hero clip (unievent/data/sample_stream.npz) from a recording.

    python scripts/make_sample.py RECORDING.raw [dur_us] [max_events]

Decodes a CC0 Prophesee recording, picks the densest legible window, uniformly
decimates (seeded) for the web, and writes the committed sample_stream.npz. Run
once; the small real npz is what ships in the repo (the multi-GB recording is not).
"""
from __future__ import annotations

import sys

import unievent as ue


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    recording = argv[1]
    dur_us = int(argv[2]) if len(argv) > 2 else 500_000
    max_events = int(argv[3]) if len(argv) > 3 else 120_000
    start_us = int(argv[4]) if len(argv) > 4 else None  # None -> auto densest window

    stream = ue.io.build_sample_stream(
        recording, dur_us=dur_us, max_events=max_events, start_us=start_us
    )
    print(f"[make_sample] {stream!r}")
    print(f"[make_sample] wrote {ue.io.DEFAULT_SAMPLE}")
    size_mb = ue.io.DEFAULT_SAMPLE.stat().st_size / 1e6
    print(f"[make_sample] npz size: {size_mb:.2f} MB")
    print(f"[make_sample] window_us: {stream.source['window_us']}  decimation: {stream.source['decimation']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
