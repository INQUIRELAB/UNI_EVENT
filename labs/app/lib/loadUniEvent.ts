// The ONE loader the Labs use for every UniEvent web bundle.
// Reads manifest.json + payload.bin and returns typed arrays ready for three.js.
// The renderer switches only on `representation`; no per-rep parsing lives here.
// Contract: WEB_BUNDLE_SCHEMA.md (one import, two audiences — same bytes the lib emits).

export type TypedArray = Int8Array | Int16Array | Int32Array | Float32Array;

export interface BufferSpec {
  dtype: "int8" | "int16" | "int32" | "float32";
  shape: number[];
  offset: number;
  length: number;
}

export interface Manifest {
  schema: string;
  representation: string;
  resolution: { H: number; W: number };
  source: { name: string; license: string; simulated: number; note?: string; [k: string]: unknown };
  buffers: Record<string, BufferSpec>;
  stats: Record<string, number>;
  params?: Record<string, unknown>;
  caption?: string;
}

export interface Bundle {
  representation: string;
  manifest: Manifest;
  buffers: Record<string, TypedArray>;
}

const VIEWS = {
  int8: Int8Array,
  int16: Int16Array,
  int32: Int32Array,
  float32: Float32Array,
} as const;
const BYTES = { int8: 1, int16: 2, int32: 4, float32: 4 } as const;

export async function loadUniEvent(dir: string): Promise<Bundle> {
  const base = dir.replace(/\/$/, "");

  const mr = await fetch(`${base}/manifest.json`);
  if (!mr.ok) throw new Error(`loadUniEvent: manifest fetch failed (${mr.status}) for ${base}`);
  const manifest = (await mr.json()) as Manifest;

  const pr = await fetch(`${base}/payload.bin`);
  if (!pr.ok) throw new Error(`loadUniEvent: payload fetch failed (${pr.status}) for ${base}`);
  const payload = await pr.arrayBuffer();

  const buffers: Record<string, TypedArray> = {};
  for (const [name, spec] of Object.entries(manifest.buffers)) {
    const View = VIEWS[spec.dtype];
    const bytesPer = BYTES[spec.dtype];
    if (!View) throw new Error(`loadUniEvent: unknown dtype "${spec.dtype}" for buffer "${name}"`);
    const elements = spec.shape.reduce((a, b) => a * b, 1);
    if (spec.length !== elements * bytesPer)
      throw new Error(`loadUniEvent: buffer "${name}" length ${spec.length}B != ${elements}*${bytesPer}B`);
    if (spec.offset % bytesPer !== 0) {
      buffers[name] = new View(payload.slice(spec.offset, spec.offset + spec.length));
    } else {
      buffers[name] = new View(payload, spec.offset, elements);
    }
  }

  return { representation: manifest.representation, buffers, manifest };
}
