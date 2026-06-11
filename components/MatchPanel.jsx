"use client";
import { useEffect, useState } from "react";
import { TEAM } from "@/lib/teams";
import Flag from "./Flag";
import { statusOf, fmtTime, fmtDay } from "./useMatches";

const gUrl = n => `https://www.google.com/search?q=${encodeURIComponent(n + " footballer")}`;
const norm = s => (s || "").toLowerCase().replace(/[^a-zà-ÿ]/g, "");
const sameP = (a, b) => {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x) || x.split(" ").pop() === y.split(" ").pop();
};

/* resolve substitutions against a lineup: returns {off:{name:minute}, on:{name:minute}} */
function resolveSubs(subs, lu) {
  const off = {}, on = {};
  if (!lu) return { off, on };
  const xiNames = (lu.xi || []).map(p => p.name);
  for (const s of subs) {
    if (!s.team || !lu.team || norm(s.team) !== norm(lu.team)) continue;
    const p1InXI = xiNames.some(n => sameP(n, s.p1));
    const outName = p1InXI ? s.p1 : s.p2;
    const inName = p1InXI ? s.p2 : s.p1;
    if (outName) off[norm(outName)] = s.minute;
    if (inName) on[norm(inName)] = s.minute;
  }
  return { off, on };
}

function PlayerLink({ p, fill, text, subOff }) {
  return (
    <a href={gUrl(p.name)} target="_blank" rel="noopener noreferrer"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textDecoration: "none", opacity: subOff != null ? 0.55 : 1 }}>
      <span style={{ width: 32, height: 32, borderRadius: "50%", background: fill, color: text, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 12, position: "relative" }}>
        {p.number ?? "–"}
        {subOff != null && <span style={{ position: "absolute", top: -7, right: -9, fontSize: 10, color: "#FF3B4E", background: "var(--navy1)", borderRadius: 99, padding: "0 4px", border: "1px solid rgba(255,59,78,.5)" }}>↓{subOff}'</span>}
      </span>
      <span style={{ background: "rgba(5,9,22,.72)", borderRadius: 99, padding: "2px 8px", fontSize: 10.5, color: "var(--txt)", whiteSpace: "nowrap", maxWidth: 92, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name.split(" ").slice(-1)[0]}</span>
    </a>
  );
}

/* rows from grid "row:col"; falls back to position groups when grid missing */
function rowsOf(lu) {
  const xi = lu?.xi || [];
  const withGrid = xi.filter(p => p.grid);
  if (withGrid.length >= 8) {
    const rows = {};
    for (const p of xi) {
      const r = p.grid ? +p.grid.split(":")[0] : 1;
      (rows[r] = rows[r] || []).push(p);
    }
    return Object.keys(rows).sort((a, b) => a - b)
      .map(r => rows[r].sort((a, b) => (+(a.grid || "0:0").split(":")[1]) - (+(b.grid || "0:0").split(":")[1])));
  }
  const order = ["G", "D", "M", "F"];
  return order.map(k => xi.filter(p => (p.pos || "")[0] === k)).filter(r => r.length);
}

function Pitch({ hLu, aLu, mh, ma, offH, offA }) {
  const hRows = rowsOf(hLu), aRows = rowsOf(aLu);
  const half = (rows, top, flip, fill, text, off) => {
    const n = rows.length || 1;
    return rows.map((row, ri) => {
      const y = flip
        ? top + ((ri + 0.55) / (n + 0.4)) * 46   // away: GK at top
        : top + ((n - ri - 0.45) / (n + 0.4)) * 46; // home: GK at bottom
      return (
        <div key={ri} style={{ position: "absolute", top: `${y}%`, left: 0, right: 0, display: "flex", justifyContent: "space-evenly", transform: "translateY(-50%)" }}>
          {row.map((p, i) => <PlayerLink key={i} p={p} fill={fill} text={text} subOff={off[norm(p.name)]} />)}
        </div>
      );
    });
  };
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "10/14", maxHeight: 560, borderRadius: 14, overflow: "hidden", background: "repeating-linear-gradient(180deg,#16451B 0,#16451B 60px,#123A17 60px,#123A17 120px)", border: "1px solid var(--line)" }}>
      <div style={{ position: "absolute", inset: 10, border: "1.5px solid rgba(234,243,222,.4)", borderRadius: 4 }} />
      <div style={{ position: "absolute", left: 10, right: 10, top: "50%", borderTop: "1.5px solid rgba(234,243,222,.4)" }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", width: 90, height: 90, border: "1.5px solid rgba(234,243,222,.4)", borderRadius: "50%", transform: "translate(-50%,-50%)" }} />
      <div style={{ position: "absolute", left: "28%", right: "28%", top: 10, height: "13%", border: "1.5px solid rgba(234,243,222,.4)", borderTop: "none" }} />
      <div style={{ position: "absolute", left: "28%", right: "28%", bottom: 10, height: "13%", border: "1.5px solid rgba(234,243,222,.4)", borderBottom: "none" }} />
      {half(aRows, 2, true, "var(--gold)", "#241A02", offA)}
      {half(hRows, 52, false, "var(--green)", "var(--green-dark)", offH)}
    </div>
  );
}

function BenchCol({ lu, flagId, on }) {
  return (
    <div style={{ flex: 1, minWidth: 170 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <Flag id={flagId} size={22} radius={3} />
        <span className="mono-dim" style={{ fontSize: 9.5, letterSpacing: ".1em" }}>BENCH</span>
      </div>
      {(lu?.subs || []).map((p, i) => {
        const inMin = on[norm(p.name)];
        return (
          <a key={i} href={gUrl(p.name)} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", gap: 9, alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--line-soft)", fontSize: 12.5, textDecoration: "none", color: "var(--txt2)" }}>
            <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--txt3)", width: 22, textAlign: "right" }}>{p.number ?? "–"}</span>
            <span style={{ color: "var(--txt)" }}>{p.name}</span>
            {inMin != null && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--green)", fontFamily: "var(--mono)" }}>↑ {inMin}'</span>}
          </a>
        );
      })}
      {!(lu?.subs || []).length && <p className="mono-dim" style={{ fontSize: 10.5 }}>Bench TBA</p>}
    </div>
  );
}

function ListCol({ lu, flagId, off }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Flag id={flagId} size={26} radius={3} />
        <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 13, textTransform: "uppercase" }}>{TEAM[flagId].name}</span>
      </div>
      {lu?.formation && <div className="mono-dim" style={{ fontSize: 10, marginBottom: 8 }}>{lu.formation}{lu.coach ? ` · ${lu.coach}` : ""}</div>}
      {(lu?.xi || []).map((p, i) => {
        const o = off[norm(p.name)];
        return (
          <a key={i} href={gUrl(p.name)} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--line-soft)", fontSize: 13, textDecoration: "none", opacity: o != null ? 0.55 : 1 }}>
            <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--green)", width: 24, textAlign: "right" }}>{p.number ?? "–"}</span>
            <span style={{ color: "var(--txt)" }}>{p.name}</span>
            <span className="mono-dim" style={{ marginLeft: "auto", fontSize: 10 }}>{o != null ? `↓ ${o}'` : p.pos || ""}</span>
          </a>
        );
      })}
    </div>
  );
}

export default function MatchPanel({ m, now, onClose }) {
  const [lineups, setLineups] = useState(null);
  const [subs, setSubs] = useState([]);
  const [view, setView] = useState("pitch");
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
        const [lr, er] = await Promise.all([
          fetch(`/api/lineup?fid=${m.afId}`).then(r => r.json()),
          s !== "up" ? fetch(`/api/events?fid=${m.afId}`).then(r => r.json()) : Promise.resolve({ subs: [] }),
        ]);
        if (!alive) return;
        setLineups(lr.lineups || []);
        setSubs(er.subs || []);
      } catch { if (alive) setLineups([]); }
    };
    load();
    const t = setInterval(load, 120000);
    return () => { alive = false; clearInterval(t); };
  }, [m.afId, s]);

  const hLu = lineups?.find(l => sameP(l.team, H.name)) || lineups?.[0];
  const aLu = lineups?.find(l => l !== hLu) || lineups?.[1];
  const announced = lineups && lineups.length >= 2 && (hLu?.xi?.length || 0) > 0;
  const { off: offH, on: onH } = resolveSubs(subs, hLu);
  const { off: offA, on: onA } = resolveSubs(subs, aLu);

  return (
    <div className="qp-back" onClick={onClose}>
      <div className="qp" style={{ maxWidth: 660, maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span className="mono-dim" style={{ letterSpacing: ".1em" }}>
            {m.group ? `GROUP ${m.group}` : (m.stage || "").replace(/_/g, " ")} · {fmtDay(m.ko)} · {fmtTime(m.ko)}
          </span>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "var(--navy1)", border: "1px solid var(--line)", borderRadius: "50%", width: 32, height: 32, color: "var(--txt2)", fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
          <Flag id={m.h} size={40} />
          {s !== "up" && m.hs !== null
            ? <span style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 32 }}>{m.hs} <span style={{ color: "var(--txt3)", fontSize: 19 }}>–</span> {m.as}</span>
            : <span className="vs" style={{ fontSize: 14 }}>VS</span>}
          <Flag id={m.a} size={40} />
          {s === "live" && <span className="badge live">LIVE{m.minute ? ` · ${m.minute}'` : ""}</span>}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, marginBottom: 14, fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt3)", flexWrap: "wrap" }}>
          <span>{H.name.toUpperCase()}{hLu?.formation ? ` · ${hLu.formation}` : ""}{hLu?.coach ? ` · ${hLu.coach}` : ""}</span>
          <span>{A.name.toUpperCase()}{aLu?.formation ? ` · ${aLu.formation}` : ""}{aLu?.coach ? ` · ${aLu.coach}` : ""}</span>
        </div>

        {announced ? <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[["pitch", "Pitch view"], ["list", "List"]].map(([k, l]) => (
              <button key={k} className={`chip-btn${view === k ? " on" : ""}`} style={{ fontSize: 10.5, padding: "6px 13px" }} onClick={() => setView(k)}>{l}</button>
            ))}
          </div>
          {view === "pitch"
            ? <Pitch hLu={hLu} aLu={aLu} mh={m.h} ma={m.a} offH={offH} offA={offA} />
            : <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}><ListCol lu={hLu} flagId={m.h} off={offH} /><ListCol lu={aLu} flagId={m.a} off={offA} /></div>}
          {subs.length > 0 && (
            <div className="mono-dim" style={{ fontSize: 9.5, letterSpacing: ".08em", margin: "10px 0 0" }}>
              ↓ SUBBED OFF · ↑ SUBBED ON — MINUTE SHOWN
            </div>
          )}
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 16, borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
            <BenchCol lu={hLu} flagId={m.h} on={onH} />
            <BenchCol lu={aLu} flagId={m.a} on={onA} />
          </div>
          <p className="mono-dim" style={{ fontSize: 9.5, marginTop: 12 }}>Tap any player to open a Google search in a new tab.</p>
        </> : lineups === null ? (
          <p className="mono-dim" style={{ textAlign: "center", padding: "20px 0" }}>Checking for lineups…</p>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 14, textTransform: "uppercase", color: "var(--txt2)" }}>Lineups TBA</p>
            <p className="mono-dim" style={{ marginTop: 6 }}>Starting XIs usually drop about an hour before kickoff — this panel updates automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
