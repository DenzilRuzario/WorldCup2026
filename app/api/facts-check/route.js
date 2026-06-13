import { NextResponse } from "next/server";
import { sbGet } from "@/lib/sbRest";

export const dynamic = "force-dynamic";

export async function GET() {
  const [facts, results] = await Promise.all([
    sbGet("match_facts?select=match_id,updated_at"),
    sbGet("results?select=match_id,home,away"),
  ]);

  // Also fetch live match IDs
  let matchIds = [];
  try {
    const key = process.env.FOOTBALL_DATA_API_KEY;
    if (key) {
      const r = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
        headers: { "X-Auth-Token": key }, cache: "no-store",
      });
      if (r.ok) {
        const d = await r.json();
        matchIds = (d.matches || [])
          .filter(m => m.homeTeam?.shortName && m.awayTeam?.shortName)
          .map(m => ({
            id: String(m.id),
            match: `${m.homeTeam.shortName} v ${m.awayTeam.shortName}`,
            status: m.status,
            date: m.utcDate?.slice(0, 10),
          }))
          .slice(0, 20);
      }
    }
  } catch (e) { matchIds = [String(e)]; }

  return NextResponse.json({
    savedFacts: facts || [],
    savedResults: results || [],
    liveMatchIds: matchIds,
    note: "Compare savedFacts[].match_id with liveMatchIds[].id — they must match exactly",
  });
}
