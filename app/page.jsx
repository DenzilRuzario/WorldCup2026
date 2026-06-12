"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TEAM } from "@/lib/teams";
import { useMatches, statusOf, fmtDay, fmtTime } from "@/components/useMatches";
import MatchCard from "@/components/MatchCard";
import QuickPanel from "@/components/QuickPanel";
import MatchPanel from "@/components/MatchPanel";
import Flag from "@/components/Flag";
import Trophy from "@/components/Trophy";

const SPOTLIGHT = ["bra", "ger", "arg", "fra"];

/* fetch goalscorers for a finished match */
function useGoals(m) {
  const [goals, setGoals] = useState(null);
  useEffect(() => {
    if (!m.afId) return;
    fetch(`/api/events?fid=${m.afId}`)
      .then(r => r.json())
      .then(d => setGoals(d.goals || []))
      .catch(() => setGoals([]));
  }, [m.afId]);
  return goals;
}

/* goalscorer two-column layout */
function Scorers({ m, goals }) {
  if (!goals || goals.length === 0) return null;
  const H = TEAM[m.h], A = TEAM[m.a];

  // group goals by team, matching on partial team name
  const norm = s => (s || "").toLowerCase();
  const isHome = g => norm(g.team).includes(norm(H.name).slice(0, 5)) ||
    norm(H.name).includes(norm(g.team).slice(0, 5));
  const hGoals = goals.filter(g => isHome(g));
  const aGoals = goals.filter(g => !isHome(g));
  const maxRows = Math.max(hGoals.length, aGoals.length);

  const GoalLine = ({ g, right }) => (
    <div style={{
      fontSize: 11.5, color: "var(--txt2)", lineHeight: 1.4,
      textAlign: right ? "right" : "left",
      fontFamily: "var(--mono)",
    }}>
      <span style={{ color: "var(--txt)" }}>
        {g.own ? "OG " : g.penalty ? "✦ " : ""}{g.scorer.split(" ").slice(-1)[0]}
      </span>
      {" "}<span style={{ color: "var(--txt3)" }}>{g.minute}{g.extra ? `+${g.extra}` : ""}'</span>
    </div>
  );

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr",
      gap: "2px 16px", marginTop: 10,
      borderTop: "1px solid var(--line-soft)", paddingTop: 8,
    }}>
      {Array.from({ length: maxRows }).map((_, i) => (
        <>
          <div key={`h${i}`}>{hGoals[i] && <GoalLine g={hGoals[i]} />}</div>
          <div key={`a${i}`} style={{ textAlign: "right" }}>{aGoals[i] && <GoalLine g={aGoals[i]} right />}</div>
        </>
      ))}
    </div>
  );
}

/* result card with goalscorers */
function ResultCard({ m }) {
  const goals = useGoals(m);
  const H = TEAM[m.h], A = TEAM[m.a];
  return (
    <div className="card" style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span className="mono-dim" style={{ fontSize: 10 }}>
          {m.group ? `GRP ${m.group}` : (m.stage || "").replace(/_/g, " ")} · {fmtDay(m.ko)}
        </span>
        <span className="badge ft" style={{ fontSize: 9, padding: "2px 7px" }}>FT</span>
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "var(--disp)", fontWeight: 800, fontSize: 13,
        textTransform: "uppercase", gap: 8,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Flag id={m.h} size={24} radius={3} />{H.name}
        </span>
        <span style={{ fontFamily: "var(--mono)", color: "var(--gold)", fontSize: 18, fontWeight: 900 }}>
          {m.hs !== null && m.hs !== undefined ? `${m.hs} – ${m.as}` : "FT"}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {A.name}<Flag id={m.a} size={24} radius={3} />
        </span>
      </div>
      <Scorers m={m} goals={goals} />
      {goals === null && m.afId && (
        <div className="mono-dim" style={{ fontSize: 9.5, marginTop: 6 }}>Loading scorers…</div>
      )}
    </div>
  );
}

export default function Home() {
  const { matches, source, loading } = useMatches();
  const [quick, setQuick] = useState(null);
  const [panel, setPanel] = useState(null);
  const [shrunk, setShrunk] = useState(false);
  const now = new Date();

  useEffect(() => { const t = setTimeout(() => setShrunk(true), 5000); return () => clearTimeout(t); }, []);

  const live    = matches.filter(m => statusOf(m, now) === "live" && m.h && m.a);
  const upcoming = matches.filter(m => statusOf(m, now) === "up" && m.h && m.a).slice(0, 3);
  const results  = matches.filter(m => statusOf(m, now) === "ft" && m.h && m.a)
                          .slice(-6).reverse();

  return (
    <main>
      <div className={`hero${shrunk ? " shrunk" : ""}`}>
        <span className="troph" style={shrunk ? { display: "none" } : undefined}><Trophy size={120} /></span>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="strip">🏆 World Cup 2026 <span className="g">·</span> Jun 11 — Jul 19 <span className="g">·</span> USA · Canada · Mexico</div>
          <div className="hero-inner">
            <div className="eyebrow">JUN 11 — JUL 19 · USA · CANADA · MEXICO</div>
            <h1>The World<br />United by <span className="g">Football</span></h1>
            <p>Live scores, team guides and fan predictions for the FIFA World Cup 2026.</p>
            <Link href="/predictions" className="btn-g">Make your predictions</Link>
          </div>
        </div>
      </div>

      <div className="predict-strip">
        <span>🎯 Think you know football?</span>
        <Link href="/predictions">Make your predictions</Link>
      </div>

      <div className="wrap" style={{ paddingBottom: 40 }}>

        {/* LIVE */}
        {live.length > 0 && <>
          <div className="sec-h" style={{ justifyContent: "center", gap: 12 }}>
            <h2>Live</h2><span className="badge live">LIVE</span>
          </div>
          <div className="live-stage">
            {live.map(m => <MatchCard key={m.id} m={m} now={now} onTeam={setQuick} onOpen={setPanel} big />)}
          </div>
        </>}

        {/* UPCOMING — always next 3 */}
        <div className="sec-h">
          <h2>Upcoming Matches</h2>
          <Link href="/predictions" style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 11 }}>Predict →</Link>
        </div>
        {loading
          ? <p className="mono-dim">Loading fixtures…</p>
          : upcoming.length
            ? <div className="grid auto-280">
                {upcoming.map(m => <MatchCard key={m.id} m={m} now={now} onTeam={setQuick} onOpen={setPanel} />)}
              </div>
            : <p className="mono-dim">No upcoming matches scheduled — check back soon.</p>}

        {/* RESULTS */}
        {results.length > 0 && <>
          <div className="sec-h"><h2>Recent Results</h2></div>
          <div className="grid auto-280">
            {results.map(m => <ResultCard key={m.id} m={m} />)}
          </div>
        </>}

        {/* SPOTLIGHT */}
        <div className="sec-h"><h2>Team Spotlight</h2></div>
        <div className="grid auto-220">
          {SPOTLIGHT.map(id => {
            const t = TEAM[id];
            return (
              <div key={id} className="card lift">
                <div style={{ marginBottom: 12 }}><Flag id={id} size={64} radius={6} /></div>
                <div style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 17, textTransform: "uppercase" }}>{t.name}</div>
                <div className="mono-dim" style={{ margin: "5px 0 12px" }}>{t.titles}× World Cup winner · {t.apps} appearances</div>
                <button className="btn-g sm" onClick={() => setQuick(id)}>View team</button>
              </div>
            );
          })}
        </div>

        {source === "sample" && <p className="mono-dim" style={{ marginTop: 18 }}>Showing sample fixtures — add your FOOTBALL_DATA_API_KEY for live data.</p>}
      </div>

      {quick && <QuickPanel id={quick} onClose={() => setQuick(null)} />}
      {panel && <MatchPanel m={matches.find(x => x.id === panel.id) || panel} now={now} onClose={() => setPanel(null)} />}
    </main>
  );
}
