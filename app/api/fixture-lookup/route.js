import { NextResponse } from "next/server";
import { afTeamId } from "@/lib/afmap";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const h = searchParams.get("h"), a = searchParams.get("a"), date = searchParams.get("date");
  const key = process.env.API_FOOTBALL_KEY;
  if (!h || !a || !date || !key) return NextResponse.json({ fid: null });

  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${date}`,
      { headers: { "x-apisports-key": key }, next: { revalidate: 600 } }
    );
    if (!res.ok) return NextResponse.json({ fid: null });
    const data = await res.json();
    const match = (data.response || []).find(f => {
      const fh = afTeamId(f.teams?.home?.name), fa = afTeamId(f.teams?.away?.name);
      return fh === h && fa === a;
    });
    return NextResponse.json({ fid: match?.fixture?.id ?? null });
  } catch {
    return NextResponse.json({ fid: null });
  }
}
