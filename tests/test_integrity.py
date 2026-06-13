"""The integrity rule (rubric check 4): you cannot fabricate raw spikes from an
aggregate. ``represent(EventSample, as_="spike")`` MUST raise."""
from __future__ import annotations

import numpy as np
import pytest

import unievent as ue
from unievent import EventSample, UniEventIntegrityError


def _voxel_sample():
    return EventSample(
        kind="voxel",
        data={
            "coords": np.zeros((3, 3), np.int32),
            "feats": np.ones((3, 2), np.float32),
        },
        H=720,
        W=1280,
        source={"name": "agg", "license": "CC0", "simulated": 0},
    )


def test_spike_from_aggregate_raises():
    with pytest.raises(UniEventIntegrityError):
        ue.represent(_voxel_sample(), as_="spike")


def test_spike_from_stream_is_fine():
    r = ue.represent(ue.sample_stream(), as_="spike")
    assert r.kind == "spike" and r.buffers["t"].shape[0] > 0


def test_bad_input_type_raises():
    with pytest.raises(TypeError):
        ue.represent([1, 2, 3], as_="frame")


def test_resample_voxel_to_frame_is_honest():
    s = ue.sample_stream()
    vox = ue.represent(s, as_="voxel")
    sample = EventSample(
        kind="voxel",
        data={"coords": vox.buffers["coords"], "feats": vox.buffers["feats"]},
        H=s.H,
        W=s.W,
        source=s.source,
    )
    fr = ue.represent(sample, as_="frame")
    assert fr.kind == "frame" and fr.buffers["frame"].shape == (s.H, s.W)


def test_resample_dishonest_conversion_raises():
    # voxel -> graph would need per-event data the aggregate dropped
    sample = _voxel_sample()
    with pytest.raises(NotImplementedError):
        ue.represent(sample, as_="graph")
