"use client";
import { TEAM } from "@/lib/teams";
import Flag from "./Flag";
import { statusOf, fmtTime, fmtDay, countdown } from "./useMatches";

const Badge = ({ s, minute }) =>
  s === "live" ? <span className="badge live">LIVE{minute ? ` · ${minute}'` : ""}</span> :
  s === "ft"   ? <span className="badge ft">FT</span> :
                 <span className="badge up">UPCOMING</span>;

function Side({ id, label, onTeam }) {
  if (id) {
    return (
      <button className="side" onClick={() => onTeam && onTeam(id)}>
        <Flag id={id} size={44} /><span className="tn">{TEAM[id].name}</span>
      </button>
    );
  }
  // Unresolved knockout slot — e.g. "Winner Group A" / "TBD"
  return (
    <div className="side" style={{ cursor: "default" }}>
      <span style={{
        width: 44, height: 31, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--navy1)", border: "1px dashed var(--line)", color: "var(--txt3)",
        fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700,
      }}>?</span>
      <span className="tn" style={{ color: "var(--txt3)" }}>{label || "TBD"}</span>
    </div>
  );
}

export default function MatchCard({ m, now, onTeam }) {
  const s = statusOf(m, now);
  const hasScore = s !== "up" && m.hs !== null && m.hs !== undefined;
  const label = m.group ? `GROUP ${m.group}` : (m.stage || "").replace(/_/g, " ");
  return (
    <div className="mcard lift">
      <div className="top">
        <span>{label} · {fmtDay(m.ko)} · {fmtTime(m.ko)}</span>
        <Badge s={s} minute={m.minute} />
      </div>
      <div className="mid">
        <Side id={m.h} label={m.hLabel} onTeam={onTeam} />
        {hasScore
          ? <span className="score">{m.hs}<span className="dash">–</span>{m.as}</span>
          : <span className="vs">VS</span>}
        <Side id={m.a} label={m.aLabel} onTeam={onTeam} />
      </div>
      <div className={`foot${s === "live" ? " live" : ""}`}>
        {s === "live" ? "▸ Live now" : s === "up" ? `Kickoff in ${countdown(m.ko, now)}` : (m.venue ? m.venue.split(",")[0] : "Full time")}
      </div>
    </div>
  );
}
