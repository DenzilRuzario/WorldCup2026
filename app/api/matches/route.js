import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { T } from "@/lib/teams";
import { FALLBACK } from "@/lib/fallback";
import { afTeamId, afStatus } from "@/lib/afmap";
import { afAllowed } from "@/lib/afQuota";

const TLA = Object.fromEntries(T.map(t => [t.id.toUpperCase(), t.id]));
const NAME = Object.fromEntries(T.map(t => [t.name.toLowerCase(), t.id]));

const mapStatus = s =>
  s === "IN_PLAY" || s === "PAUSED" ? "live" :
  s === "FINISHED" ? "ft" : "up";

const matchTeam = apiTeam => {
  if (!apiTeam) return null;
  if (apiTeam.tla && TLA[apiTeam.tla]) return TLA[apiTeam.tla];
  const n = (apiTeam.name || "").toLowerCase().trim();
  if (n.length < 4) return null;
  if (NAME[n]) return NAME[n];
  for (const t of T) {
    const tn = t.name.toLowerCase();
    if (n.includes(tn) || tn.includes(n)) return t.id;
  }
  return null;
};
const slotLabel = apiTeam => {
  const n = (apiTeam?.name || "").trim();
  return n && n.toLowerCase() !== "null" ? n : "TBD";
};

/* API-Football: today's fixtures (live status, scores, minute, fixture ids) */
async function fetchAFraw(date) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return [];
  // tick happens here — inside the cached function — so it only counts
  // real upstream calls, not every visitor poll
  if (!(await afAllowed())) return [];
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${date}`,
      { headers: { "x-apisports-key": key }, cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.response || [])
      .map(f => {
        const h = afTeamId(f.teams?.home?.name), a = afTeamId(f.teams?.away?.name);
        if (!h || !a || h === a) return null;
        return {
          h, a,
          afId: f.fixture?.id,
          ko: f.fixture?.date,
          status: afStatus(f.fixture?.status?.short),
          minute: f.fixture?.status?.elapsed ?? null,
          hs: f.goals?.home ?? null,
          as: f.goals?.away ?? null,
        };
      })
      .filter(Boolean);
  } catch { return []; }
}
const fetchAF = (date) =>
  unstable_cache(() => fetchAFraw(date), ["af-fixtures", date], { revalidate: 600 })();

/* football-data.org: full tournament schedule */
async function fetchFD() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": key },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const matches = (data.matches || [])
      .map(m => {
        const h = matchTeam(m.homeTeam), a = matchTeam(m.awayTeam);
        if (h && a && h === a) return null;
        return {
          id: String(m.id),
          group: m.group ? m.group.replace("GROUP_", "") : null,
          stage: m.stage,
          matchday: m.matchday ?? null,
          h, a,
          hLabel: h ? null : slotLabel(m.homeTeam),
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
    return matches.length ? matches : null;
  } catch { return null; }
}

export async function GET() {
  const fd = await fetchFD();
  const matches = fd || FALLBACK;

  // Quota guard: API-Football free tier = 100 req/day.
  // Only call during match windows (75 min pre-KO → 2.5 h post-KO); on
  // multi-match days the windows union naturally. Matches near UTC midnight
  // get their own date fetched. Calls are also budget-capped via Supabase.
  const now = Date.now();
  const activeDates = [...new Set(
    matches
      .filter(m => {
        const ko = new Date(m.ko).getTime();
        return now >= ko - 75 * 60000 && now <= ko + 150 * 60000;
      })
      .map(m => new Date(m.ko).toISOString().slice(0, 10))
  )].slice(0, 2);
  const af = (await Promise.all(activeDates.map(d => fetchAF(d)))).flat();

  // Merge: API-Football is the source of truth for live status / score / minute / lineup id
  for (const m of matches) {
    if (!m.h || !m.a) continue;
    const live = af.find(f =>
      f.h === m.h && f.a === m.a &&
      Math.abs(new Date(f.ko) - new Date(m.ko)) < 3 * 3600 * 1000
    );
    if (live) {
      m.afId = live.afId;
      if (live.status !== "up") {
        m.status = live.status;
        m.minute = live.minute;
        if (live.hs !== null) { m.hs = live.hs; m.as = live.as; }
      }
    }
  }

  return NextResponse.json({ source: fd ? "live" : "sample", matches });
}
