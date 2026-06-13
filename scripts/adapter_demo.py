"""Opus-4.8 adapter generation — the creative showpiece.

Paste a NEW dataset format → Claude (Opus 4.8) writes a conforming adapter →
the conformance gate flashes GREEN (a real EventStream + all 4 builders run on a
format Claude had never seen). No scripted fake: the generated adapter must
actually pass, or this exits non-zero.

    python scripts/adapter_demo.py

Needs `anthropic` (pip install 'unievent[ai]') + ANTHROPIC_API_KEY (env or labs/.env.local).
"""
from __future__ import annotations

import csv
import importlib.util
import os
import re
import sys
from pathlib import Path

import numpy as np

import unievent as ue

ROOT = Path(__file__).resolve().parent.parent
SAMPLE = ROOT / "scripts" / "_demo_newformat.csv"
GEN = ROOT / "scripts" / "_generated_adapter.py"


def load_key() -> str | None:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        return key
    envf = ROOT / "labs" / ".env.local"
    if envf.exists():
        for line in envf.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("ANTHROPIC_API_KEY"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def make_sample() -> tuple[int, int]:
    """A NEW, made-up format: CSV `timestamp_us,x_px,y_px,polarity(-1/1)`."""
    rng = np.random.default_rng(0)
    H, W = 240, 320
    rows = []
    t = 0
    for i in range(5000):
        t += int(rng.integers(1, 40))
        x = int(np.clip(int((i / 5000) * W) + rng.integers(-4, 5), 0, W - 1))
        y = int(rng.integers(0, H))
        rows.append((t, x, y, 1 if rng.random() < 0.5 else -1))
    with open(SAMPLE, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["timestamp_us", "x_px", "y_px", "polarity"])
        w.writerows(rows)
    return H, W


CONTRACT = """Write ONE Python function:

    def read_events(path):
        '''Return a dict of numpy arrays / ints:
           t : int64 microseconds, ascending
           x : int16, 0 <= x < W
           y : int16, 0 <= y < H
           p : int8 in {{0, 1}}   (1 = ON / brighter, 0 = OFF)
           H, W : int (sensor height, width)
        '''

The file at `path` is a CSV with a header. Its first lines are:
{head}

Rules: use ONLY numpy and the stdlib `csv` module. Map the columns to the canonical
fields. If polarity is -1/1, convert -1 -> 0 and 1 -> 1. Sort by time if not already.
Infer W and H from max x and max y (+1). Return ONLY the function inside a ```python code block."""


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252
    except Exception:
        pass
    key = load_key()
    if not key:
        print("[adapter-demo] no ANTHROPIC_API_KEY (env or labs/.env.local)")
        return 2
    try:
        import anthropic
    except ImportError:
        print("[adapter-demo] needs anthropic: pip install 'unievent[ai]'")
        return 2

    H, W = make_sample()
    head = "\n".join(SAMPLE.read_text(encoding="utf-8").splitlines()[:5])
    print(f"[adapter-demo] NEW format: {SAMPLE.name}  ({W}x{H})  cols: timestamp_us,x_px,y_px,polarity(-1/1)")
    print("[adapter-demo] asking Claude (Opus 4.8) to write a conforming adapter for a format it has never seen…")

    client = anthropic.Anthropic(api_key=key)
    msg = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1500,
        messages=[{"role": "user", "content": CONTRACT.format(head=head)}],
    )
    text = "".join(b.text for b in msg.content if b.type == "text")
    m = re.search(r"```python\s*(.*?)```", text, re.S)
    code = (m.group(1) if m else text).strip()
    GEN.write_text(code + "\n", encoding="utf-8")
    print(f"[adapter-demo] Claude wrote {GEN.name} ({len(code)} chars). Running the conformance gate…\n")

    spec = importlib.util.spec_from_file_location("_gen_adapter", GEN)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    d = mod.read_events(str(SAMPLE))

    # CONFORMANCE GATE — a real EventStream (validates invariants) + all 4 builders.
    stream = ue.EventStream(
        t=d["t"], x=d["x"], y=d["y"], p=d["p"], H=int(d["H"]), W=int(d["W"]),
        source={"name": "generated:newformat", "license": "SYNTHETIC", "simulated": 1},
    )
    print(f"  PASS  EventStream valid — {stream!r}")
    for r in ("spike", "voxel", "frame", "graph"):
        rep = ue.represent(stream, as_=r)
        shapes = {k: tuple(v.shape) for k, v in rep.buffers.items()}
        print(f"  PASS  represent(as_={r!r}) -> {shapes}")
    print("\n[adapter-demo] ✅ CONFORMANCE GREEN — Claude's adapter works; the 4 builders ran on a brand-new format.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
