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
  const n = (apiTeam.name || "").toLowerCase().trim();
  // Empty or placeholder names ("TBD", "1A", "Winner Match 74") must NOT fuzzy-match.
  if (n.length < 4) return null;
  if (NAME[n]) return NAME[n];
  for (const t of T) {
    const tn = t.name.toLowerCase();
    if (n.includes(tn) || tn.includes(n)) return t.id;
  }
  return null;
};

// Human-readable label for an unresolved knockout slot.
const slotLabel = apiTeam => {
  const n = (apiTeam?.name || "").trim();
  return n && n.toLowerCase() !== "null" ? n : "TBD";
};

const fallbackPayload = () =>
  NextResponse.json({ source: "sample", matches: FALLBACK });

export async function GET() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return fallbackPayload();

  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": key },
      next: { revalidate: 60 },
    });
    if (!res.ok) return fallbackPayload();
    const data = await res.json();

    const matches = (data.matches || [])
      .map(m => {
        const h = matchTeam(m.homeTeam), a = matchTeam(m.awayTeam);
        // Safety net: a team can never play itself.
        if (h && a && h === a) return null;
        return {
          id: String(m.id),
          group: m.group ? m.group.replace("GROUP_", "") : null,
          stage: m.stage,
          h, a,                                   // null when slot not yet decided
          hLabel: h ? null : slotLabel(m.homeTeam), // e.g. "Winner Group A" / "TBD"
          aLabel: a ? null : slotLabel(m.awayTeam),
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
