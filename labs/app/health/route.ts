// Health endpoint for the rubric live-site check (GET /health -> 200).
export const dynamic = "force-static";

export function GET() {
  return Response.json({ ok: true, app: "unievent-labs" });
}
