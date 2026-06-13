"""Reproducibility: every RNG is seeded (the v1 reference shipped unseeded
sampling). Same stream + same seed -> byte-identical output."""
from __future__ import annotations

import numpy as np

import unievent as ue


def test_graph_is_deterministic():
    s = ue.sample_stream()
    e1 = ue.represent(s, as_="graph").buffers["edges"]
    e2 = ue.represent(s, as_="graph").buffers["edges"]
    assert np.array_equal(e1, e2), "seeded graph subsample must be reproducible"


def test_graph_seed_changes_sample():
    from unievent.representations import graph

    s = ue.sample_stream()
    a = graph.build(s, seed=0).buffers["nodes"]
    b = graph.build(s, seed=1).buffers["nodes"]
    assert not np.array_equal(a, b), "different seeds should pick different nodes"


def test_voxel_is_deterministic():
    s = ue.sample_stream()
    v1 = ue.represent(s, as_="voxel").buffers["coords"]
    v2 = ue.represent(s, as_="voxel").buffers["coords"]
    assert np.array_equal(v1, v2)
