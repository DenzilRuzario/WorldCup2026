"use client";
import { useState } from "react";
import Link from "next/link";
import { TEAM } from "@/lib/teams";
import { useMatches, statusOf, fmtDay } from "@/components/useMatches";
import MatchCard from "@/components/MatchCard";
import QuickPanel from "@/components/QuickPanel";
import Flag from "@/components/Flag";
import Trophy from "@/components/Trophy";

const SPOTLIGHT = ["bra", "ger", "arg", "fra"];

export default function Home() {
  const { matches, source, loading } = useMatches();
  const [quick, setQuick] = useState(null);
  const now = new Date();

  const live = matches.filter(m => statusOf(m, now) === "live");
  const today = matches.filter(m => new Date(m.ko).toDateString() === now.toDateString());
  const upcoming = matches.filter(m => statusOf(m, now) === "up").slice(0, 6);
  const headline = today.length ? today : upcoming.slice(0, 3);
  const shown = [...live.filter(m => !headline.includes(m)), ...headline].slice(0, 6);
  const results = matches.filter(m => statusOf(m, now) === "ft").slice(-4).reverse();

  return (
    <main>
      <div className="hero">
        <span className="troph"><Trophy size={120} /></span>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="eyebrow">JUN 11 — JUL 19 · USA · CANADA · MEXICO</div>
          <h1>The World<br />United by <span className="g">Football</span></h1>
          <p>Live scores, team guides and fan predictions for the FIFA World Cup 2026.</p>
          <Link href="/predictions" className="btn-g">Make your predictions</Link>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 30 }}>
        <div className="sec-h">
          <h2>{live.length ? "Live Scores" : today.length ? "Today's Matches" : "Next Matches"}</h2>
          <Link href="/predictions" style={{ color: "var(--green)", fontFamily: "var(--mono)", fontSize: 11 }}>Predict →</Link>
        </div>
        {loading
          ? <p className="mono-dim">Loading fixtures…</p>
          : <div className="grid auto-280">{shown.map(m => <MatchCard key={m.id} m={m} now={now} onTeam={setQuick} />)}</div>}

        {results.length > 0 && <>
          <div className="sec-h"><h2>Recent Results</h2></div>
          <div className="grid auto-220">
            {results.map(m => (
              <div key={m.id} className="card lift" style={{ padding: "10px 13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontFamily: "var(--mono)", color: "var(--txt2)", fontWeight: 700 }}>
                  <span>{m.group ? `GRP ${m.group}` : ""} · {fmtDay(m.ko)}</span><span>FT</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--disp)", fontWeight: 800, fontSize: 13, textTransform: "uppercase", marginTop: 8, gap: 8 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Flag id={m.h} size={26} radius={3} /> {m.h.toUpperCase()}</span>
                  <span style={{ fontFamily: "var(--mono)", color: "var(--gold)" }}>{m.hs} – {m.as}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>{m.a.toUpperCase()} <Flag id={m.a} size={26} radius={3} /></span>
                </div>
              </div>
            ))}
          </div>
        </>}

        <div className="sec-h"><h2>Quick Team Spotlight</h2></div>
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
    </main>
  );
}
