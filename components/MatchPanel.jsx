"use client";
import { useEffect, useState } from "react";
import { TEAM } from "@/lib/teams";
import Flag from "./Flag";
import { statusOf, fmtTime, fmtDay } from "./useMatches";

export default function MatchPanel({ m, now, onClose }) {
  const [lineups, setLineups] = useState(null); // null=loading, []=not announced
  const s = statusOf(m, now);
  const H = TEAM[m.h], A = TEAM[m.a];

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!m.afId) { setLineups([]); return; }
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/lineup?fid=${m.afId}`);
        const d = await r.json();
        if (alive) setLineups(d.lineups || []);
      } catch { if (alive) setLineups([]); }
    };
    load();
    const t = setInterval(load, 120000); // re-check every 2 min until announced
    return () => { alive = false; clearInterval(t); };
  }, [m.afId]);

  const Col = ({ lu, flagId }) => (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Flag id={flagId} size={26} radius={3} />
        <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 13, textTransform: "uppercase" }}>{TEAM[flagId].name}</span>
      </div>
      {lu?.formation && <div className="mono-dim" style={{ fontSize: 10, marginBottom: 8 }}>{lu.formation}{lu.coach ? ` · ${lu.coach}` : ""}</div>}
      {(lu?.xi || []).map((p, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--line-soft)", fontSize: 13 }}>
          <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--green)", width: 24, textAlign: "right" }}>{p.number ?? "–"}</span>
          <span style={{ color: "var(--txt)" }}>{p.name}</span>
          <span className="mono-dim" style={{ marginLeft: "auto", fontSize: 10 }}>{p.pos || ""}</span>
        </div>
      ))}
    </div>
  );

  const hLu = lineups?.find(l => l.team && l.team.toLowerCase().includes(H.name.toLowerCase().slice(0, 5)));
  const aLu = lineups?.find(l => l !== hLu);
  const announced = lineups && lineups.length >= 2 && (lineups[0]?.xi?.length || 0) > 0;

  return (
    <div className="qp-back" onClick={onClose}>
      <div className="qp" style={{ maxWidth: 640, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span className="mono-dim" style={{ letterSpacing: ".1em" }}>
            {m.group ? `GROUP ${m.group}` : (m.stage || "").replace(/_/g, " ")} · {fmtDay(m.ko)} · {fmtTime(m.ko)}
          </span>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "var(--navy1)", border: "1px solid var(--line)", borderRadius: "50%", width: 32, height: 32, color: "var(--txt2)", fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 18 }}>
          <Flag id={m.h} size={44} />
          {s !== "up" && m.hs !== null
            ? <span style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 34 }}>{m.hs} <span style={{ color: "var(--txt3)", fontSize: 20 }}>–</span> {m.as}</span>
            : <span className="vs" style={{ fontSize: 14 }}>VS</span>}
          <Flag id={m.a} size={44} />
          {s === "live" && <span className="badge live">LIVE{m.minute ? ` · ${m.minute}'` : ""}</span>}
        </div>

        {announced ? (
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            <Col lu={hLu || lineups[0]} flagId={m.h} />
            <Col lu={aLu || lineups[1]} flagId={m.a} />
          </div>
        ) : lineups === null ? (
          <p className="mono-dim" style={{ textAlign: "center", padding: "20px 0" }}>Checking for lineups…</p>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 14, textTransform: "uppercase", color: "var(--txt2)" }}>Lineups TBA</p>
            <p className="mono-dim" style={{ marginTop: 6 }}>Starting XIs are usually announced about an hour before kickoff — this panel updates automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
