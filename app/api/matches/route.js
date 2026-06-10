import { NextResponse } from "next/server";
import { T } from "@/lib/teams";
import { FALLBACK } from "@/lib/fallback";

// football-data.org TLAs map directly onto our team ids (uppercased).
const TLA = Object.fromEntries(T.map(t => [t.id.toUpperCase(), t.id]));
const NAME = Object.fromEntries(T.map(t => [t.name.toLowerCase(), t.id]));

const mapStatus = s =>
  s === "IN_PLAY" || s === "PAUSED" ? "live" :
  s === "FINISHED" ? "ft" : "up";

const matchTeam = apiTeam => {
  if (!apiTeam) return null;
  if (apiTeam.tla && TLA[apiTeam.tla]) return TLA[apiTeam.tla];
  const n = (apiTeam.name || "").toLowerCase();
  if (NAME[n]) return NAME[n];
  // loose contains-match for naming variants ("Korea Republic" etc.)
  for (const t of T) if (n.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(n)) return t.id;
  return null;
};

const fallbackPayload = () =>
  NextResponse.json({ source: "sample", matches: FALLBACK });

export async function GET() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return fallbackPayload();

  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": key },
      // one upstream call per minute max — well inside the free 10/min limit
      next: { revalidate: 60 },
    });
    if (!res.ok) return fallbackPayload();
    const data = await res.json();

    const matches = (data.matches || [])
      .map(m => {
        const h = matchTeam(m.homeTeam), a = matchTeam(m.awayTeam);
        if (!h || !a) return null; // skip TBD knockout slots
        return {
          id: String(m.id),
          group: m.group ? m.group.replace("GROUP_", "") : null,
          stage: m.stage,
          h, a,
          ko: m.utcDate,
          status: mapStatus(m.status),
          minute: m.minute ?? null,
          hs: m.score?.fullTime?.home ?? null,
          as: m.score?.fullTime?.away ?? null,
          venue: m.venue || null,
        };
      })
      .filter(Boolean)
      .sort((x, y) => new Date(x.ko) - new Date(y.ko));

    if (!matches.length) return fallbackPayload();
    return NextResponse.json({ source: "live", matches });
  } catch {
    return fallbackPayload();
  }
}
