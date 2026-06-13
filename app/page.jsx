"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TEAM } from "@/lib/teams";
import { getSupabase } from "@/lib/supabase";
import { useMatches, statusOf, fmtDay, fmtTime } from "@/components/useMatches";
import MatchCard from "@/components/MatchCard";
import QuickPanel from "@/components/QuickPanel";
import MatchPanel from "@/components/MatchPanel";
import Flag from "@/components/Flag";
import Trophy from "@/components/Trophy";

const SPOTLIGHT = ["bra", "ger", "arg", "fra"];

/* match facts: prefer manually-entered goals/cards, else API events */
function useFacts(m) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!m.id) return;
    const sb = getSupabase();
    if (!sb) { setData({ goals: [], cards: [] }); return; }
    // Read directly from Supabase — bypasses the Next.js server cache entirely
    sb.from("match_facts")
      .select("data")
      .eq("match_id", m.id)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row?.data) {
          setData({ goals: row.data.goals || [], cards: row.data.cards || [] });
        } else if (m.afId) {
          // No manual facts — fall back to API events
          fetch(`/api/events?fid=${m.afId}`)
            .then(r => r.json())
            .then(d => setData({ goals: d.goals || [], cards: d.cards || [] }))
            .catch(() => setData({ goals: [], cards: [] }));
        } else {
          setData({ goals: [], cards: [] });
        }
      })
      .catch(() => setData({ goals: [], cards: [] }));
  }, [m.id, m.afId]);
  return data;
}

/* goals + cards two-column infographic */
function Facts({ m, facts }) {
  if (!facts) return null;
  const { goals = [], cards = [] } = facts;
  if (goals.length === 0 && cards.length === 0) return null;
  const H = TEAM[m.h], A = TEAM[m.a];
  const norm = s => (s || "").toLowerCase();
  const isHome = e => {
    if (e.side) return e.side === "h";
    return norm(e.team).includes(norm(H.name).slice(0, 5)) || norm(H.name).includes(norm(e.team).slice(0, 5));
  };
  const min = e => `${e.minute}${e.extra ? `+${e.extra}` : ""}'`;
  const surname = n => (n || "").split(" ").slice(-1)[0];

  const hGoals = goals.filter(isHome), aGoals = goals.filter(e => !isHome(e));
  const hCards = cards.filter(isHome), aCards = cards.filter(e => !isHome(e));

  const GoalLine = ({ g, right }) => (
    <div style={{ fontSize: 11.5, lineHeight: 1.5, textAlign: right ? "right" : "left", fontFamily: "var(--mono)" }}>
      <span style={{ color: "var(--txt)" }}>{g.own ? "OG " : ""}{surname(g.scorer)}</span>{" "}
      <span style={{ color: "var(--txt3)" }}>{min(g)}{g.penalty ? " (P)" : ""}</span>
    </div>
  );
  const CardLine = ({ c, right }) => (
    <div style={{ fontSize: 11, lineHeight: 1.5, textAlign: right ? "right" : "left", fontFamily: "var(--mono)", display: "flex", gap: 5, justifyContent: right ? "flex-end" : "flex-start", alignItems: "center" }}>
      {right && <><span style={{ color: "var(--txt2)" }}>{surname(c.player)} <span style={{ color: "var(--txt3)" }}>{min(c)}</span></span><Card red={c.red} /></>}
      {!right && <><Card red={c.red} /><span style={{ color: "var(--txt2)" }}>{surname(c.player)} <span style={{ color: "var(--txt3)" }}>{min(c)}</span></span></>}
    </div>
  );

  return (
    <div style={{ marginTop: 10, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>
      {(hGoals.length > 0 || aGoals.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1px 10px", alignItems: "start" }}>
          <div>{hGoals.map((g, i) => <GoalLine key={i} g={g} />)}</div>
          <div style={{ alignSelf: "center", fontSize: 13 }}>⚽</div>
          <div>{aGoals.map((g, i) => <GoalLine key={i} g={g} right />)}</div>
        </div>
      )}
      {(hCards.length > 0 || aCards.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1px 10px", alignItems: "start", marginTop: 6 }}>
          <div>{hCards.map((c, i) => <CardLine key={i} c={c} />)}</div>
          <div style={{ alignSelf: "center" }}><Card red /></div>
          <div>{aCards.map((c, i) => <CardLine key={i} c={c} right />)}</div>
        </div>
      )}
    </div>
  );
}
function Card({ red }) {
  return <span style={{ display: "inline-block", width: 9, height: 12, borderRadius: 1.5, background: red ? "#FF3B4E" : "#F5C518", flex: "0 0 auto" }} />;
}

/* result card with goalscorers */
function ResultCard({ m }) {
  const facts = useFacts(m);
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
      <Facts m={m} facts={facts} />
      {facts === null && m.afId && (
        <div className="mono-dim" style={{ fontSize: 9.5, marginTop: 6 }}>Loading match facts…</div>
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
