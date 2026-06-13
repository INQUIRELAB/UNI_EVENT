"""``voxel`` — sparse space-time-polarity grid.

The stream is binned into ``bins`` temporal slices; each active ``(t_bin, y, x)``
voxel carries an ``[off, on]`` count. We keep the FULL temporal structure (one
voxel per active bin) — we do NOT collapse time to a single ``argmax`` bin per
pixel (the v1 reference bug). Polarity channel order is LOCKED to ``[off, on]``
to match SPEC.md / WEB_BUNDLE_SCHEMA.md / the viewer.
"""
from __future__ import annotations

import numpy as np

from .base import Representation

DEFAULT_BINS = 16


def build(stream, bins: int = DEFAULT_BINS) -> Representation:
    H, W = stream.H, stream.W
    t = stream.t.astype(np.int64)
    t0 = int(t[0])
    span = max(int(t[-1]) - t0, 1)

    # integer temporal binning, clipped to [0, bins)
    t_bin = np.clip(((t - t0) * bins) // span, 0, bins - 1).astype(np.int64)

    x = stream.x.astype(np.int64)
    y = stream.y.astype(np.int64)

    # flat key per (t_bin, y, x); unique -> sparse active voxels (full temporal structure kept)
    key = (t_bin * H + y) * W + x
    uniq, inv = np.unique(key, return_inverse=True)
    inv = inv.ravel()
    m = uniq.shape[0]

    on_mask = stream.p == 1
    off_count = np.zeros(m, dtype=np.float32)
    on_count = np.zeros(m, dtype=np.float32)
    np.add.at(off_count, inv[~on_mask], np.float32(1.0))
    np.add.at(on_count, inv[on_mask], np.float32(1.0))
    feats = np.stack([off_count, on_count], axis=1)  # [off, on] LOCKED

    tb = (uniq // (H * W)).astype(np.int32)
    rem = uniq % (H * W)
    vy = (rem // W).astype(np.int32)
    vx = (rem % W).astype(np.int32)
    coords = np.stack([tb, vy, vx], axis=1).astype(np.int32)  # [t_bin, y, x]

    return Representation(
        kind="voxel",
        buffers={"coords": coords, "feats": feats},
        H=H,
        W=W,
        source=dict(stream.source),
        stats={
            "n_events": stream.n_events,
            "n_voxels": int(m),
            "bins": int(bins),
            "on_frac": round(stream.on_frac, 4),
        },
        params={"bins": int(bins), "channel_order": ["off", "on"]},
    )
