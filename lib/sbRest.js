// Minimal Supabase REST helpers for server routes (anon key).
const cfg = () => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export async function sbGet(path) {
  const { url, key } = cfg();
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function sbUpsert(table, rows) {
  const { url, key } = cfg();
  if (!url || !key || !rows?.length) return false;
  try {
    const r = await fetch(`${url}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(rows),
    });
    return r.ok;
  } catch { return false; }
}
