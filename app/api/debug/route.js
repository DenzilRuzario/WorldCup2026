import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const out = { at: new Date().toISOString() };

  // football-data
  const fdKey = process.env.FOOTBALL_DATA_API_KEY;
  out.fd = { keyPresent: !!fdKey };
  if (fdKey) {
    try {
      const r = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
        headers: { "X-Auth-Token": fdKey }, cache: "no-store",
      });
      out.fd.http = r.status;
      if (r.ok) {
        const d = await r.json();
        const today = new Date().toDateString();
        const todays = (d.matches || []).filter(m => new Date(m.utcDate).toDateString() === today);
        out.fd.totalMatches = (d.matches || []).length;
        out.fd.today = todays.map(m => ({
          teams: `${m.homeTeam?.name} v ${m.awayTeam?.name}`,
          ko: m.utcDate, status: m.status,
          score: `${m.score?.fullTime?.home ?? "-"}:${m.score?.fullTime?.away ?? "-"}`,
        }));
      } else out.fd.body = (await r.text()).slice(0, 200);
    } catch (e) { out.fd.error = String(e).slice(0, 200); }
  }

  // api-football
  const afKey = process.env.API_FOOTBALL_KEY;
  out.af = { keyPresent: !!afKey };
  if (afKey) {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const r = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
        headers: { "x-apisports-key": afKey }, cache: "no-store",
      });
      out.af.http = r.status;
      const d = await r.json();
      out.af.errors = d.errors && Object.keys(d.errors).length ? d.errors : null;
      out.af.results = d.results ?? 0;
      const wc = (d.response || []).filter(f => f.league?.id === 1 || /world cup/i.test(f.league?.name || ""));
      out.af.worldCupFixtures = wc.map(f => ({
        teams: `${f.teams?.home?.name} v ${f.teams?.away?.name}`,
        status: f.fixture?.status?.short, elapsed: f.fixture?.status?.elapsed,
        goals: `${f.goals?.home ?? "-"}:${f.goals?.away ?? "-"}`,
      })).slice(0, 8);
    } catch (e) { out.af.error = String(e).slice(0, 200); }
  }

  // match_facts table + live/finished match IDs (to diagnose facts not showing)
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const r = await fetch(`${url}/rest/v1/match_facts?select=match_id,data`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
    });
    out.matchFacts = { http: r.status, rows: r.ok ? await r.json() : await r.text() };
  } catch (e) { out.matchFacts = String(e).slice(0, 150); }

  // current match IDs from our own merged feed
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "";
    const r = await fetch(`${base}/api/matches`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      out.matchIds = (d.matches || [])
        .filter(m => m.h && m.a)
        .slice(0, 40)
        .map(m => ({ id: m.id, t: `${m.h}-${m.a}`, status: m.status, score: `${m.hs ?? "-"}:${m.as ?? "-"}` }));
    }
  } catch (e) { out.matchIds = String(e).slice(0, 150); }

  // quota counter
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const r = await fetch(`${url}/rest/v1/af_usage?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
    });
    out.quota = await r.json();
  } catch (e) { out.quota = String(e).slice(0, 100); }

  return NextResponse.json(out);
}
