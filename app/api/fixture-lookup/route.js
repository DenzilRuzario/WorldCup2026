import { NextResponse } from "next/server";
import { afTeamId } from "@/lib/afmap";
import { afAllowed } from "@/lib/afQuota";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

async function lookupRaw(h, a, date) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return null;
  if (!(await afAllowed("fixtures"))) return null;
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${date}`,
      { headers: { "x-apisports-key": key }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const match = (data.response || []).find(f => {
      const fh = afTeamId(f.teams?.home?.name), fa = afTeamId(f.teams?.away?.name);
      return fh === h && fa === a;
    });
    return match?.fixture?.id ?? null;
  } catch { return null; }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const h = searchParams.get("h"), a = searchParams.get("a"), date = searchParams.get("date");
  if (!h || !a || !date) return NextResponse.json({ fid: null });

  // Cache per team-pair+date so multiple panel opens don't each cost a call
  const fid = await unstable_cache(
    () => lookupRaw(h, a, date),
    ["fixture-lookup", h, a, date],
    { revalidate: 3600 }
  )();

  return NextResponse.json({ fid: fid ?? null });
}
