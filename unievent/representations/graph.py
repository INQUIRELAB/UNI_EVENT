"""``graph`` — kNN graph in normalized (x, y, t) space.

Subsample ``n`` nodes (SEEDED — reproducible, unlike the v1 reference), build a
k-nearest-neighbour graph in normalized ``(x/W, y/H, t/t_span)`` space. Returns
COO ``edge_index`` (2, E) plus node positions (n, 3) = (x, y, t).
"""
from __future__ import annotations

import numpy as np

from .base import Representation

DEFAULT_NODES = 1200
DEFAULT_K = 4
DEFAULT_SEED = 0


def build(stream, n: int = DEFAULT_NODES, k: int = DEFAULT_K, seed: int = DEFAULT_SEED) -> Representation:
    H, W = stream.H, stream.W
    N = stream.n_events
    n = int(min(n, N))
    if n < k + 1:
        raise ValueError(f"graph: need at least k+1={k+1} nodes, got n={n}")

    rng = np.random.default_rng(seed)  # SEEDED — deterministic subsample
    idx = np.sort(rng.choice(N, size=n, replace=False))

    t = stream.t.astype(np.float64)
    t0 = float(t[0])
    span = max(float(t[-1]) - t0, 1.0)
    xs = stream.x[idx].astype(np.float64)
    ys = stream.y[idx].astype(np.float64)
    ts = t[idx]

    pts = np.stack([xs / W, ys / H, (ts - t0) / span], axis=1)

    try:
        from scipy.spatial import cKDTree

        tree = cKDTree(pts)
        _, nbr = tree.query(pts, k=k + 1)  # first neighbour is self
        nbr = np.asarray(nbr)[:, 1:]
    except ImportError:  # pragma: no cover - scipy is a core dep
        nbr = _knn_bruteforce(pts, k)

    src = np.repeat(np.arange(n, dtype=np.int64), k)
    dst = nbr.reshape(-1).astype(np.int64)
    edges = np.stack([src, dst], axis=0).astype(np.int64)  # (2, E) COO

    nodes = np.stack([xs, ys, (ts - t0)], axis=1).astype(np.float32)  # (n,3) x,y,t(µs, zero-based)

    return Representation(
        kind="graph",
        buffers={"nodes": nodes, "edges": edges},
        H=H,
        W=W,
        source=dict(stream.source),
        stats={"num_nodes": int(n), "num_edges": int(edges.shape[1]), "k": int(k)},
        params={"n": int(n), "k": int(k), "seed": int(seed)},
    )


def _knn_bruteforce(pts: np.ndarray, k: int) -> np.ndarray:
    d = np.sqrt(((pts[:, None, :] - pts[None, :, :]) ** 2).sum(-1))
    np.fill_diagonal(d, np.inf)
    return np.argsort(d, axis=1)[:, :k]
