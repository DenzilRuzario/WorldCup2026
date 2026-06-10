"use client";
import Link from "next/link";
import { TEAM } from "@/lib/teams";

export default function QuickPanel({ id, onClose }) {
  const t = TEAM[id];
  if (!t) return null;
  return (
    <div className="qp-back" onClick={onClose}>
      <div className="qp" onClick={e => e.stopPropagation()}>
        <div className="hd">
          <span style={{ fontSize: 36 }}>{t.flag}</span>
          <div>
            <div style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 21, textTransform: "uppercase" }}>{t.name}</div>
            <div className="mono-dim" style={{ letterSpacing: ".1em" }}>GROUP {t.group} · FIFA RANK #{t.rank}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--txt3)", fontSize: 18, cursor: "pointer" }} aria-label="Close">✕</button>
        </div>
        <div className="stats">
          <div className="st"><b>{t.titles}</b><span>World Cup titles</span></div>
          <div className="st"><b>{t.apps}</b><span>Appearances</span></div>
        </div>
        <p className="body2">{t.summary}</p>
        <div style={{ marginTop: 16 }}>
          <Link href={`/teams/${t.id}`} className="btn-g full" onClick={onClose}>View full team</Link>
        </div>
      </div>
    </div>
  );
}
