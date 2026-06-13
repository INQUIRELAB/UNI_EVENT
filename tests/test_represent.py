"""SPEC-conformance: the four builders produce the exact shapes/dtypes the
rubric (check 3) and SPEC.md require, all from the SAME real stream."""
from __future__ import annotations

import numpy as np
import pytest

import unievent as ue


@pytest.fixture(scope="module")
def stream():
    return ue.sample_stream()


def test_stream_is_real_raw(stream):
    assert isinstance(stream, ue.EventStream)
    assert stream.n_events > 1000
    assert stream.simulated == 0, "hero stream must be real (simulated=0)"
    assert stream.t.dtype == np.int64 and np.all(np.diff(stream.t) >= 0)
    assert stream.x.dtype == np.int16 and stream.y.dtype == np.int16
    assert stream.p.dtype == np.int8 and set(np.unique(stream.p).tolist()) <= {0, 1}
    assert 0 <= int(stream.x.min()) and int(stream.x.max()) < stream.W
    assert 0 <= int(stream.y.min()) and int(stream.y.max()) < stream.H


def test_spike(stream):
    r = ue.represent(stream, as_="spike")
    assert r.kind == "spike"
    n = stream.n_events
    for k, dt in (("t", np.int64), ("x", np.int16), ("y", np.int16), ("p", np.int8)):
        assert r.buffers[k].dtype == dt, k
        assert r.buffers[k].shape == (n,), k


def test_frame(stream):
    r = ue.represent(stream, as_="frame")
    f = r.buffers["frame"]
    assert f.dtype == np.float32 and f.shape == (stream.H, stream.W)
    # signed accumulation: must contain both polarities -> negative and positive pixels
    assert f.min() < 0 < f.max()


def test_voxel_shapes_and_channel_order(stream):
    r = ue.represent(stream, as_="voxel")
    coords, feats = r.buffers["coords"], r.buffers["feats"]
    assert coords.dtype == np.int32 and coords.shape[1] == 3  # [t_bin, y, x]
    assert feats.dtype == np.float32 and feats.shape[1] == 2  # [off, on]
    assert coords.shape[0] == feats.shape[0]
    # [off, on] LOCKED: channel 1 sums to #ON events, channel 0 to #OFF
    assert feats[:, 1].sum() == float((stream.p == 1).sum())
    assert feats[:, 0].sum() == float((stream.p == 0).sum())
    assert int(coords[:, 0].max()) < r.params["bins"]


def test_graph(stream):
    r = ue.represent(stream, as_="graph")
    nodes, edges = r.buffers["nodes"], r.buffers["edges"]
    assert nodes.dtype == np.float32 and nodes.shape[1] == 3
    assert edges.dtype == np.int64 and edges.shape[0] == 2
    assert int(edges.min()) >= 0 and int(edges.max()) < nodes.shape[0]
    assert edges.shape[1] == nodes.shape[0] * r.params["k"]


def test_timesurface(stream):
    r = ue.represent(stream, as_="timesurface")
    s = r.buffers["surface"]
    assert s.dtype == np.float32 and s.shape == (2, stream.H, stream.W)
    assert float(s.min()) >= 0.0 and float(s.max()) <= 1.0 + 1e-5


def test_unknown_representation(stream):
    with pytest.raises(ValueError):
        ue.represent(stream, as_="not_a_rep")
