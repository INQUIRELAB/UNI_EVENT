// Live "ask about this clip" — Claude (Opus 4.8) answers grounded in the REAL,
// measured event-camera stats. The pre-baked tutor narration is the reliable
// floor; this route is the live wow. Never fabricates: the stats are the context.
import Anthropic from "@anthropic-ai/sdk";
import stats from "../../../public/data/stats.json";

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { question?: string };
    const question = (body.question ?? "").toString().slice(0, 600).trim();
    if (!question) {
      return Response.json({ error: "missing question" }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "tutor-offline" }, { status: 503 });
    }

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

    return Response.json({ answer, model: msg.model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "tutor error";
    return Response.json({ error: message }, { status: 500 });
  }
}
