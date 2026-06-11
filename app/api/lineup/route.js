import { NextResponse } from "next/server";

export async function GET(req) {
  const fid = new URL(req.url).searchParams.get("fid");
  const key = process.env.API_FOOTBALL_KEY;
  if (!fid || !key) return NextResponse.json({ lineups: [] });
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fid}`,
      { headers: { "x-apisports-key": key }, next: { revalidate: 600 } }
    );
    if (!res.ok) return NextResponse.json({ lineups: [] });
    const data = await res.json();
    const lineups = (data.response || []).map(t => ({
      team: t.team?.name,
      formation: t.formation,
      coach: t.coach?.name,
      xi: (t.startXI || []).map(p => ({
        name: p.player?.name,
        number: p.player?.number,
        pos: p.player?.pos,
        grid: p.player?.grid || null,
      })),
      subs: (t.substitutes || []).slice(0, 12).map(p => ({
        name: p.player?.name,
        number: p.player?.number,
      })),
    }));
    return NextResponse.json({ lineups });
  } catch {
    return NextResponse.json({ lineups: [] });
  }
}
