"use client";
import { TEAM } from "@/lib/teams";
import { statusOf, fmtTime, fmtDay, countdown } from "./useMatches";

const Badge = ({ s, minute }) =>
  s === "live" ? <span className="badge live">LIVE{minute ? ` · ${minute}'` : ""}</span> :
  s === "ft"   ? <span className="badge ft">FT</span> :
                 <span className="badge up">UPCOMING</span>;

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
        <button className="side" onClick={() => onTeam && onTeam(m.h)}>
          <span className="flag">{TEAM[m.h].flag}</span><span className="tn">{TEAM[m.h].name}</span>
        </button>
        {hasScore
          ? <span className="score">{m.hs}<span className="dash">–</span>{m.as}</span>
          : <span className="vs">VS</span>}
        <button className="side" onClick={() => onTeam && onTeam(m.a)}>
          <span className="flag">{TEAM[m.a].flag}</span><span className="tn">{TEAM[m.a].name}</span>
        </button>
      </div>
      <div className={`foot${s === "live" ? " live" : ""}`}>
        {s === "live" ? "▸ Live now" : s === "up" ? `Kickoff in ${countdown(m.ko, now)}` : (m.venue ? m.venue.split(",")[0] : "Full time")}
      </div>
    </div>
  );
}
