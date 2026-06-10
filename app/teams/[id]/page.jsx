"use client";
import { useState } from "react";
import Link from "next/link";
import { TEAM, DETAILS } from "@/lib/teams";
import { useMatches, statusOf } from "@/components/useMatches";
import MatchCard from "@/components/MatchCard";
import QuickPanel from "@/components/QuickPanel";
import Flag from "@/components/Flag";

const POS = { GK: "Goalkeepers", DF: "Defenders", MF: "Midfielders", FW: "Forwards" };

/* Renders only if the image actually exists in /public/people/ */
function Avatar({ src, green }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={src} alt="" className={`avatar${green ? " green" : ""}`} onError={() => setOk(false)} />;
}

/* Frosted squad-photo background — activates when /public/teams/{id}.jpg exists */
function TeamBackdrop({ id }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div className="team-bg">
      <img src={`/teams/${id}.jpg`} alt="" onError={() => setOk(false)} />
      <div className="frost" />
    </div>
  );
}

export default function TeamPage({ params }) {
  const { id } = params;
  const t = TEAM[id];
  const d = DETAILS[id];
  const { matches } = useMatches();
  const [quick, setQuick] = useState(null);
  const now = new Date();

  if (!t) return <main className="wrap" style={{ padding: 40 }}><p className="body2">Team not found. <Link href="/teams" style={{ color: "var(--green)" }}>Back to all teams</Link></p></main>;

  const mine = matches.filter(m => m.h === id || m.a === id);
  const up = mine.filter(m => statusOf(m, now) !== "ft");
  const past = mine.filter(m => statusOf(m, now) === "ft");

  return (
    <main className="wrap" style={{ padding: "24px 20px 40px", position: "relative" }}>
      <TeamBackdrop id={id} />
      <Link href="/teams" className="mono-dim" style={{ fontSize: 11.5 }}>← All teams</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", margin: "18px 0 24px" }}>
        <Flag id={id} size={86} radius={8} />
        <div>
          <h1 className="h1">{t.name}</h1>
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <span className="pill gold">FIFA RANK #{t.rank}</span>
            <span className="pill">GROUP {t.group}</span>
            {t.titles > 0 && <span className="pill gold">🏆 ×{t.titles}</span>}
          </div>
        </div>
      </div>

      {d ? <>
        <div className="sec-h"><h2>Team Overview</h2></div>
        <div className="grid fit-240">
          {[["Style of play", d.style], ["Strengths", d.strengths], ["Weaknesses", d.weaknesses], ["Tournament outlook", d.outlook]].map(([l, v]) => (
            <div key={l} className="card"><div className="lbl">{l}</div><p className="body2">{v}</p></div>
          ))}
        </div>

        <div className="grid fit-260" style={{ marginTop: 26 }}>
          <div className="card" style={{ borderColor: "rgba(232,179,57,.35)" }}>
            <div className="lbl">★ Player to watch</div>
            <div className="person-row">
              <Avatar src={`/people/${id}-ptw.jpg`} />
              <div>
                <div style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 20, textTransform: "uppercase" }}>{d.ptw.n}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--gold)", margin: "3px 0" }}>{d.ptw.c}</div>
              </div>
            </div>
            <p className="body2" style={{ fontSize: 13, marginTop: 8 }}>{d.ptw.why}</p>
          </div>
          <div className="card" style={{ borderColor: "rgba(52,232,107,.35)" }}>
            <div className="lbl">↗ Breakout candidate</div>
            <div className="person-row">
              <Avatar src={`/people/${id}-breakout.jpg`} green />
              <div>
                <div style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 20, textTransform: "uppercase" }}>{d.bo.n}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--green)", margin: "3px 0" }}>{d.bo.c}</div>
              </div>
            </div>
            <p className="body2" style={{ fontSize: 13, marginTop: 8 }}>{d.bo.why}</p>
          </div>
          <div className="card">
            <div className="lbl">Coaching staff</div>
            <div className="person-row">
              <Avatar src={`/people/${id}-coach.jpg`} />
              <div>
                <div style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 18, textTransform: "uppercase" }}>{d.coach}</div>
                <div className="mono-dim" style={{ margin: "3px 0" }}>HEAD COACH</div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              {d.assts.map(a => <div key={a} className="body2" style={{ fontSize: 13 }}>{a} · assistant</div>)}
            </div>
          </div>
        </div>

        <div className="sec-h"><h2>Squad</h2></div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {["GK", "DF", "MF", "FW"].map(p => {
            const players = d.squad.filter(s => s[0] === p);
            if (!players.length) return null;
            return (
              <div key={p}>
                <div className="squad-h">{POS[p]}</div>
                {players.map((s, i) => (
                  <div key={i} className="squad-r">
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s[1]}{s[3] === 1 && <span className="cap">Ⓒ CAPTAIN</span>}</span>
                    <span className="body2" style={{ fontSize: 12.5 }}>{s[2]}</span>
                    <span className="mono-dim" style={{ textAlign: "right" }}>{s[0]}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <p className="mono-dim" style={{ marginTop: 8, fontSize: 10 }}>Sample squad — final 26-man lists drop closer to kickoff.</p>
      </> : (
        <div className="card" style={{ borderStyle: "dashed", margin: "10px 0" }}>
          <div className="lbl">Scouting report</div>
          <p className="body2" style={{ fontSize: 14 }}>{t.summary}</p>
          <p className="mono-dim" style={{ marginTop: 10 }}>Full analysis, squad list and coaching staff coming soon for {t.name}.</p>
        </div>
      )}

      <div className="sec-h"><h2>Fixtures &amp; Results</h2></div>
      <div className="grid fit-260">
        <div>
          <div className="lbl">Upcoming</div>
          {up.length
            ? up.map(m => <div key={m.id} style={{ marginBottom: 10 }}><MatchCard m={m} now={now} onTeam={setQuick} /></div>)
            : <p className="mono-dim">No upcoming fixtures found.</p>}
        </div>
        <div>
          <div className="lbl">Previous</div>
          {past.length
            ? past.map(m => <div key={m.id} style={{ marginBottom: 10 }}><MatchCard m={m} now={now} onTeam={setQuick} /></div>)
            : <p className="mono-dim">No results yet — the tournament is just getting started.</p>}
        </div>
      </div>
      {quick && quick !== id && <QuickPanel id={quick} onClose={() => setQuick(null)} />}
    </main>
  );
}
