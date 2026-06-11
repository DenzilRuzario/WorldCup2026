import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { afAllowed } from "@/lib/afQuota";

export async function GET(req) {
  const fid = new URL(req.url).searchParams.get("fid");
  const key = process.env.API_FOOTBALL_KEY;
  if (!fid || !key) return NextResponse.json({ subs: [] });
  const subs = await unstable_cache(async () => {
    if (!(await afAllowed())) return [];
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures/events?fixture=${fid}`,
      { headers: { "x-apisports-key": key }, cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.response || [])
      .filter(e => e.type === "subst")
      .map(e => ({
        minute: e.time?.elapsed ?? null,
        team: e.team?.name || "",
        p1: e.player?.name || "",   // one of these is OFF, the other ON —
        p2: e.assist?.name || "",   // the panel resolves which by checking the starting XI
      }));
  }, ["af-events", fid], { revalidate: 600 })().catch(() => []);
  return NextResponse.json({ subs });
}
