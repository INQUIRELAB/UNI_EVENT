"""Web-bundle contract (rubric check 5): bake -> re-read -> the byte layout,
dtypes, offsets, and provenance all conform to WEB_BUNDLE_SCHEMA.md."""
from __future__ import annotations

import json

import numpy as np
import pytest

import unievent as ue

BYTES = {"int8": 1, "int16": 2, "int32": 4, "float32": 4}


@pytest.fixture(scope="module")
def stream():
    return ue.sample_stream()


@pytest.mark.parametrize("rep", ["spike", "voxel", "frame", "graph"])
def test_bundle_byte_layout(stream, tmp_path, rep):
    d = ue.represent(stream, as_=rep).to_web(tmp_path / rep)
    m = json.loads((d / "manifest.json").read_text(encoding="utf-8"))
    raw = (d / "payload.bin").read_bytes()

    assert m["schema"] == "unievent/web-bundle@1"
    assert m["representation"] == rep
    assert m["source"]["simulated"] == 0
    assert m["source"]["license"] == "CC0"

    total = 0
    for name, spec in m["buffers"].items():
        assert spec["dtype"] in BYTES, name
        elems = int(np.prod(spec["shape"]))
        assert spec["length"] == elems * BYTES[spec["dtype"]], name
        assert spec["offset"] == total, f"{name}: buffers must be tightly packed in order"
        total += spec["length"]
    assert total == len(raw) == m["payload_bytes"]


def test_spike_t_is_int32_zero_based(stream, tmp_path):
    d = ue.represent(stream, as_="spike").to_web(tmp_path / "spike")
    m = json.loads((d / "manifest.json").read_text(encoding="utf-8"))
    assert m["buffers"]["t"]["dtype"] == "int32"  # JS has no int64 view
    raw = (d / "payload.bin").read_bytes()
    s = m["buffers"]["t"]
    t = np.frombuffer(raw[s["offset"]: s["offset"] + s["length"]], dtype=np.int32)
    assert int(t[0]) == 0 and np.all(np.diff(t) >= 0)


def test_voxel_channel_order_is_off_on(stream, tmp_path):
    d = ue.represent(stream, as_="voxel").to_web(tmp_path / "voxel")
    m = json.loads((d / "manifest.json").read_text(encoding="utf-8"))
    assert m["params"]["channel_order"] == ["off", "on"]
