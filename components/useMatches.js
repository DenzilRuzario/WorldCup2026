"use client";
import { useEffect, useState } from "react";

// Client hook: fetches /api/matches, refreshes every 60s, computes status
// for sample fixtures (which carry no status from the API).
export function useMatches() {
  const [state, setState] = useState({ matches: [], source: null, loading: true });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/matches");
        const d = await r.json();
        if (alive) setState({ matches: d.matches || [], source: d.source, loading: false });
      } catch {
        if (alive) setState(s => ({ ...s, loading: false }));
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return state;
}

export const statusOf = (m, now = new Date()) => {
  if (m.status) return m.status;
  const ko = new Date(m.ko).getTime(), t = now.getTime();
  if (t < ko) return "up";
  if (t < ko + 115 * 60000) return "live";
  return "ft";
};

export const fmtTime = iso => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export const fmtDay  = iso => new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
export const countdown = (iso, now = new Date()) => {
  const ms = new Date(iso) - now;
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
};
