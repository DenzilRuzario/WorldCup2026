"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

// Lightweight, anonymous page-view tracking into Supabase.
// One random session id per browser; one row per route view.
function sessionId() {
  try {
    let s = localStorage.getItem("wc26_session");
    if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("wc26_session", s); }
    return s;
  } catch { return "anon"; }
}

export default function PageTracker() {
  const path = usePathname();
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !path || path === "/dashboard") return; // don't count dashboard views
    sb.from("page_views").insert({ path, session: sessionId() }).then(() => {});
  }, [path]);
  return null;
}
