"""``unievent`` command-line entrypoint — one command to bake the Labs bundles.

    unievent bake RECORDING.raw --out labs/public/data --reps spike,voxel,frame,graph
    unievent sample                      # build the bundled hero npz from a recording
    unievent info                        # print the bundled sample stream's provenance
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _cmd_bake(args) -> int:
    import unievent as ue

    if args.recording:
        stream = ue.io.build_sample_stream(args.recording, dur_us=args.dur_us, max_events=args.max_events)
    else:
        stream = ue.sample_stream()
    print(f"[bake] {stream!r}")
    out = Path(args.out)
    reps = [r.strip() for r in args.reps.split(",") if r.strip()]
    for rep in reps:
        dest = ue.represent(stream, as_=rep).to_web(out / rep)
        print(f"[bake] {rep:11s} -> {dest}")
    return 0


def _cmd_sample(args) -> int:
    import unievent as ue

    stream = ue.io.build_sample_stream(
        args.recording, dur_us=args.dur_us, max_events=args.max_events, name=args.name, license=args.license
    )
    print(f"[sample] wrote {ue.io.DEFAULT_SAMPLE}")
    print(f"[sample] {stream!r}")
    return 0


def _cmd_info(args) -> int:
    import unievent as ue

    stream = ue.sample_stream()
    print(f"[info] {stream!r}")
    print(json.dumps(stream.source, indent=2))
    return 0


def main(argv=None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    parser = argparse.ArgumentParser(prog="unievent", description="UniEvent — event-camera representations, one command.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    b = sub.add_parser("bake", help="bake static web bundles for the Labs")
    b.add_argument("recording", nargs="?", help="raw recording (omit to use the bundled sample)")
    b.add_argument("--out", default="labs/public/data", help="output dir (one subdir per rep)")
    b.add_argument("--reps", default="spike,voxel,frame,graph", help="comma-separated representations")
    b.add_argument("--dur-us", type=int, default=500_000)
    b.add_argument("--max-events", type=int, default=120_000)
    b.set_defaults(func=_cmd_bake)

    s = sub.add_parser("sample", help="build the bundled hero npz from a recording")
    s.add_argument("recording", help="raw recording (e.g. pedestrians.raw)")
    s.add_argument("--dur-us", type=int, default=500_000)
    s.add_argument("--max-events", type=int, default=120_000)
    s.add_argument("--name", default="prophesee:pedestrians")
    s.add_argument("--license", default="CC0")
    s.set_defaults(func=_cmd_sample)

    i = sub.add_parser("info", help="print the bundled sample provenance")
    i.set_defaults(func=_cmd_info)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
