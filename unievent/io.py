"""IO — decode raw Prophesee recordings, window/decimate, and npz round-trip.

The bundled hero clip (``unievent/data/sample_stream.npz``) is built once from a
CC0 Prophesee recording with :func:`build_sample_stream` and committed to the
repo (it is small — real per-event ``t, x, y, p``, windowed and uniformly
decimated for the web). The full multi-GB recording is never committed.

Windowing + decimation are RENDER choices, stated honestly in the provenance
block; every surviving per-event value is REAL.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np

from .core import EventStream

DATA_DIR = Path(__file__).resolve().parent / "data"
DEFAULT_SAMPLE = DATA_DIR / "sample_stream.npz"


# --------------------------------------------------------------------------- #
# decode
# --------------------------------------------------------------------------- #
def decode_raw(path, encoding: str = "evt3"):
    """Decode a Prophesee ``.raw`` recording -> (t, x, y, p) numpy arrays.

    Needs ``expelliarmus`` (``pip install 'unievent[io]'``). Crashes loudly if it
    is missing — no silent fallback to simulated data.
    """
    try:
        from expelliarmus import Wizard
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "decode_raw requires expelliarmus. Install with: pip install 'unievent[io]'"
        ) from exc

    arr = Wizard(encoding=encoding).read(str(path))
    t = arr["t"].astype(np.int64)
    x = arr["x"].astype(np.int16)
    y = arr["y"].astype(np.int16)
    p = arr["p"].astype(np.int8)
    return t, x, y, p


def _sha256(path: Path, limit_mb: int = 64) -> str:
    """SHA-256 of the first ``limit_mb`` of a file (enough to fingerprint the source)."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read(limit_mb * 1024 * 1024))
    return h.hexdigest()


# --------------------------------------------------------------------------- #
# window + decimate
# --------------------------------------------------------------------------- #
def densest_window(t: np.ndarray, dur_us: int, probe_us: int = 20_000) -> int:
    """Return the start time (µs) of the densest ``dur_us`` window.

    Scans event counts in ``probe_us`` bins and returns the start of the window
    whose summed count is maximal — the most legible region to anchor the hero.
    """
    t0 = int(t[0])
    bins = ((t - t0) // probe_us).astype(np.int64)
    counts = np.bincount(bins)
    k = max(int(round(dur_us / probe_us)), 1)
    if k >= counts.shape[0]:
        return t0
    window_sum = np.convolve(counts, np.ones(k, dtype=np.int64), mode="valid")
    best = int(np.argmax(window_sum))
    return t0 + best * probe_us


def build_sample_stream(
    raw_path,
    *,
    out_path=DEFAULT_SAMPLE,
    encoding: str = "evt3",
    start_us: int | None = None,
    dur_us: int = 500_000,
    max_events: int = 120_000,
    seed: int = 0,
    name: str = "prophesee:pedestrians",
    license: str = "CC0",
    note: str = "",
    H: int | None = None,
    W: int | None = None,
) -> EventStream:
    """Decode a CC0 recording, window + decimate, and save the bundled hero npz.

    Deterministic (seeded decimation). Crashes loudly on bad data. Returns the
    constructed :class:`EventStream` (also written to ``out_path``).
    """
    raw_path = Path(raw_path)
    if not raw_path.exists():
        raise FileNotFoundError(f"raw recording not found: {raw_path}")

    t, x, y, p = decode_raw(raw_path, encoding=encoding)

    # resolution from the data unless overridden
    W = int(W if W is not None else int(x.max()) + 1)
    H = int(H if H is not None else int(y.max()) + 1)

    # normalise polarity to {0,1} (Prophesee EVT3 already emits {0,1}; assert it)
    puniq = np.unique(p)
    if np.array_equal(puniq, np.array([-1, 1], dtype=p.dtype)):
        p = ((p + 1) // 2).astype(np.int8)  # {-1,1} -> {0,1}
    elif not np.all(np.isin(puniq, (0, 1))):
        raise ValueError(f"unexpected polarity values {puniq.tolist()} (expected {{0,1}} or {{-1,1}})")

    # pick the window
    if start_us is None:
        start_us = densest_window(t, dur_us)
    end_us = start_us + dur_us
    sel = (t >= start_us) & (t < end_us)
    if not np.any(sel):
        raise ValueError(f"empty window [{start_us}, {end_us}) µs — pick another start")
    tw, xw, yw, pw = t[sel], x[sel], y[sel], p[sel]
    n_window = int(tw.shape[0])

    # uniform decimation (SEEDED), preserving temporal order
    if n_window > max_events:
        rng = np.random.default_rng(seed)
        keep = np.sort(rng.choice(n_window, size=max_events, replace=False))
        tw, xw, yw, pw = tw[keep], xw[keep], yw[keep], pw[keep]

    source = {
        "name": name,
        "license": license,
        "simulated": 0,
        "note": note
        or (
            f"raw {encoding.upper()}, decoded with expelliarmus; window "
            f"[{start_us}, {end_us}) µs, uniformly decimated {n_window:,}->{tw.shape[0]:,} "
            "events for the web (a render choice; surviving per-event t,x,y,p are real)."
        ),
        "sensor": f"{W}x{H}",
        "original_events": int(t.shape[0]),
        "window_us": [int(start_us), int(end_us)],
        "decimation": {"from": n_window, "to": int(tw.shape[0]), "seed": int(seed)},
        "source_sha256_64mb": _sha256(raw_path),
    }

    stream = EventStream(t=tw, x=xw, y=yw, p=pw, H=H, W=W, source=source)
    save_npz(stream, out_path)
    return stream


# --------------------------------------------------------------------------- #
# npz round-trip
# --------------------------------------------------------------------------- #
def save_npz(stream: EventStream, path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        path,
        t=stream.t,
        x=stream.x,
        y=stream.y,
        p=stream.p,
        H=np.int64(stream.H),
        W=np.int64(stream.W),
        source=json.dumps(stream.source),
    )
    return path


def load_npz(path) -> EventStream:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(
            f"sample stream not found: {path}\n"
            "Build it first: python scripts/make_sample.py <recording.raw>\n"
            "Do NOT silently fall back to simulated events."
        )
    z = np.load(path, allow_pickle=False)
    source = json.loads(str(z["source"]))
    return EventStream(
        t=z["t"], x=z["x"], y=z["y"], p=z["p"], H=int(z["H"]), W=int(z["W"]), source=source
    )


def load_sample() -> EventStream:
    """Load the bundled hero clip as an :class:`EventStream`."""
    return load_npz(DEFAULT_SAMPLE)
