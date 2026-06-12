import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { afAllowed } from "@/lib/afQuota";
import { sbGet, sbUpsert } from "@/lib/sbRest";

export async function GET(req) {
  const fid = new URL(req.url).searchParams.get("fid");
  const key = process.env.API_FOOTBALL_KEY;
  if (!fid || !key) return NextResponse.json({ lineups: [] });

  // DB first: once a lineup is saved it never costs another API call
  const saved = await sbGet(`lineups?af_id=eq.${fid}&select=data`);
  if (saved?.[0]?.data?.length) return NextResponse.json({ lineups: saved[0].data, src: "db" });

  const lineups = await unstable_cache(async () => {
    if (!(await afAllowed("lineups"))) return [];
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fid}`,
      { headers: { "x-apisports-key": key }, cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.response || []).map(t => ({
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
  }, ["af-lineup", fid], { revalidate: 900 })().catch(() => []);

  // persist once both XIs are announced — one API spend per match, forever
  if (lineups.length >= 2 && lineups[0]?.xi?.length > 0 && lineups[1]?.xi?.length > 0) {
    await sbUpsert("lineups", [{ af_id: fid, data: lineups }]);
  }
  return NextResponse.json({ lineups, src: "api" });
}
