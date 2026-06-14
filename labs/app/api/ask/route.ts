// Live "ask about this clip" — Claude (Opus 4.8) answers grounded in the REAL,
// measured event-camera stats. The pre-baked tutor narration is the reliable
// floor; this route is the live wow. Never fabricates: the stats are the context.
//
// SAFE BY DEFAULT: a same-origin guard + per-IP and per-instance daily caps. On
// ANY limit, missing key, or API error it falls back to the grounded pre-baked
// read — it never errors and never burns the key unbounded. (Best-effort caps are
// per warm instance; a real KV-backed cap is flagged in HUMAN_TODO B1.)
import Anthropic from "@anthropic-ai/sdk";
import stats from "../../../public/data/stats.json";
import tutor from "../../../public/data/tutor.json";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM = `You are UniEvent's in-Labs tutor — a world expert in event-based (neuromorphic) vision, answering a curious newcomer's question about ONE specific event-camera clip.

These are the REAL, measured stats of the clip (do NOT invent numbers, objects, colours, or motion not supported here):
${JSON.stringify(stats, null, 2)}

Rules:
- The clip is EVENT-ONLY (no RGB image exists). Never describe appearance/colour you cannot derive from events. Polarity colour (warm = ON / brightening, cool = OFF / darkening) is fine.
- Ground every specific claim in the stats above; combine them with general event-camera knowledge for intuition. The 2 activity clusters + balanced polarity + the centroid drift are your evidence it is two walking people — say it as a careful inference, not certainty about identity.
- If the stats don't cover what's asked, say what you can and cannot infer — never fabricate.
- Voice: warm, vivid, first-principles, and CONCISE (2-4 sentences). This is a live demo.`;

// --- best-effort abuse caps (in-memory, per warm instance) ---------------------
const PER_IP_PER_MIN = 8;
const PER_IP_PER_DAY = 40;
const GLOBAL_PER_DAY = 400;

const ipMinute = new Map<string, number[]>(); // ip -> recent request times (ms)
const ipDayCount = new Map<string, number>();
let dayKey = "";
let globalDayCount = 0;

function preBakedRead(): string {
  const beats = (tutor as { beats: { beat: string; narration: string }[] }).beats || [];
  const read = beats.find((b) => b.beat === "read");
  return read?.narration ?? "The live tutor is at capacity right now — but every visual here is real, grounded output.";
}

function overCap(ip: string): boolean {
  const now = Date.now();
  const d = new Date().toISOString().slice(0, 10);
  if (d !== dayKey) {
    dayKey = d;
    globalDayCount = 0;
    ipDayCount.clear();
  }
  const recent = (ipMinute.get(ip) ?? []).filter((t) => now - t < 60_000);
  const perDay = ipDayCount.get(ip) ?? 0;
  if (recent.length >= PER_IP_PER_MIN || perDay >= PER_IP_PER_DAY || globalDayCount >= GLOBAL_PER_DAY) {
    return true;
  }
  recent.push(now);
  ipMinute.set(ip, recent);
  ipDayCount.set(ip, perDay + 1);
  globalDayCount += 1;
  return false;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  // OFF BY DEFAULT — the public deployment never spends API credits. The live
  // Opus call only runs when LIVE_TUTOR=1 is set in the server environment
  // (pair with NEXT_PUBLIC_LIVE_TUTOR=1 so the Labs shows the ask box). Until
  // then every request returns the grounded pre-baked read — the key is never
  // read and Anthropic is never called.
  if (process.env.LIVE_TUTOR !== "1") {
    return Response.json({ answer: preBakedRead(), model: "pre-baked", fallback: true, disabled: true });
  }

  // cross-origin browser abuse guard (same-origin requests from the Labs pass)
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return Response.json({ error: "cross-origin not allowed" }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "bad origin" }, { status: 403 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as { question?: string };
  const question = (body.question ?? "").toString().slice(0, 600).trim();
  if (!question) {
    return Response.json({ error: "missing question" }, { status: 400 });
  }

  // safe-by-default: any cap / missing key / API error -> grounded pre-baked read.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || overCap(clientIp(req))) {
    return Response.json({ answer: preBakedRead(), model: "pre-baked", fallback: true });
  }

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 500,
      system: SYSTEM,
      messages: [{ role: "user", content: question }],
    });
    const answer = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return Response.json({ answer: answer || preBakedRead(), model: msg.model });
  } catch {
    return Response.json({ answer: preBakedRead(), model: "pre-baked", fallback: true });
  }
}
