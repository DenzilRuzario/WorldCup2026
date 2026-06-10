import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Null when env vars aren't set yet — UI degrades gracefully.
export const supabase = url && key ? createClient(url, key) : null;
