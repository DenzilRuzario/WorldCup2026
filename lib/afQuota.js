// Hard daily budget for API-Football (free tier = 100 req/day).
// Each upstream call ticks a per-endpoint counter in Supabase; past the cap
// we serve cached/degraded data instead of burning the quota.
const CAP = 88;

export async function afAllowed(endpoint = "misc") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return true; // no counter available — don't block
  try {
    const r = await fetch(`${url}/rest/v1/rpc/af_tick`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ep: endpoint }),
      cache: "no-store",
    });
    if (!r.ok) return true;
    const n = await r.json(); // returns today's TOTAL across endpoints
    return typeof n === "number" ? n <= CAP : true;
  } catch { return true; }
}
