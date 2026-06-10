import { createClient } from "@supabase/supabase-js";

// Lazy singleton — evaluated at runtime in the browser, not at build time.
// This ensures env vars are always picked up even on first deploy.
let _client = null;

export function getSupabase() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

// Keep named export for any direct imports
export const supabase = null; // replaced by getSupabase() calls
