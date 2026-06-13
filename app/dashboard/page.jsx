"use client";
import { useEffect, useState } from "react";
import { TEAM, playersOf } from "@/lib/teams";
import { getSupabase } from "@/lib/supabase";
import { useMatches } from "@/components/useMatches";

const DAY = 86400000;
const dayKey = d => new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });

function Stat({ label, value, accent }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "18px 12px" }}>
      <div style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 34, color: accent || "var(--txt)" }}>{value}</div>
      <div className="mono-dim" style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
    </div>
  );
}

const todayUTC = () => new Date().toISOString().slice(0, 10);

function ApiUsage({ rows }) {
  const today = (rows || []).filter(r => r.day === todayUTC());
  const total = today.reduce((a, r) => a + r.count, 0);
  const CAP = 88, HARD = 100;
  return (
    <>
      <div className="sec-h"><h2>API budget (API-Football)</h2></div>
      <div className="card">
        <div className="grid auto-220" style={{ marginBottom: 4 }}>
          {["fixtures", "lineups", "events"].map(ep => {
            const r = today.find(x => x.endpoint === ep);
            return <Stat key={ep} label={`${ep} calls today`} value={r?.count || 0} />;
          })}
          <Stat label={`Total / cap ${CAP}`} value={`${total}`} accent={total > CAP ? "var(--live)" : "var(--green)"} />
        </div>
        <div style={{ height: 10, borderRadius: 99, background: "var(--navy1)", border: "1px solid var(--line)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, (total / HARD) * 100)}%`, background: total > CAP ? "#FF3B4E" : "linear-gradient(90deg,#1FB551,var(--green))" }} />
        </div>
        <div className="mono-dim" style={{ fontSize: 9.5, marginTop: 6 }}>
          {Math.max(0, HARD - total)} OF {HARD} PROVIDER REQUESTS REMAINING · SITE STOPS CALLING AT {CAP} · RESETS 00:00 UTC (5:30 AM IST)
        </div>
      </div>
    </>
  );
}

function Override({ matches, matchName }) {
  const [mid, setMid] = useState("");
  const [form, setForm] = useState({ home: "", away: "", minute: "", status: "" });
  const [msg, setMsg] = useState(null);
  const candidates = matches.filter(m => m.h && m.a);

  const save = async () => {
    const sb = getSupabase(); if (!sb || !mid) return;
    const row = {
      match_id: mid,
      home: form.home === "" ? null : +form.home,
      away: form.away === "" ? null : +form.away,
      minute: form.minute === "" ? null : +form.minute,
      status: form.status || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from("overrides").upsert(row);
    setMsg(error ? `⚠ ${error.message}` : "✓ Override live — site reflects it within a minute.");
  };
  const clear = async () => {
    const sb = getSupabase(); if (!sb || !mid) return;
    const { error } = await sb.from("overrides").delete().eq("match_id", mid);
    setMsg(error ? `⚠ ${error.message}` : "✓ Override removed — back to API data.");
  };

  return (
    <>
      <div className="sec-h"><h2>Manual score override</h2></div>
      <div className="card">
        <p className="body2" style={{ fontSize: 12.5, marginBottom: 12 }}>
          Emergency control: if every provider fails mid-match, set the score here and the whole site serves it. Clear it to hand control back to the APIs.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, maxWidth: 560 }}>
          <select className="inp" value={mid} onChange={e => setMid(e.target.value)}>
            <option value="">Pick a match…</option>
            {candidates.map(m => <option key={m.id} value={m.id}>{matchName(m.id)}</option>)}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "70px 70px 80px 1fr auto auto", gap: 8 }}>
            <input className="inp" placeholder="Home" inputMode="numeric" value={form.home} onChange={e => setForm({ ...form, home: e.target.value.replace(/\D/g, "") })} />
            <input className="inp" placeholder="Away" inputMode="numeric" value={form.away} onChange={e => setForm({ ...form, away: e.target.value.replace(/\D/g, "") })} />
            <input className="inp" placeholder="Min'" inputMode="numeric" value={form.minute} onChange={e => setForm({ ...form, minute: e.target.value.replace(/\D/g, "") })} />
            <select className="inp" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="">status (keep)</option>
              <option value="live">LIVE</option>
              <option value="ft">FULL TIME</option>
              <option value="up">UPCOMING</option>
            </select>
            <button className="btn-g sm" onClick={save} disabled={!mid}>Save</button>
            <button className="chip-btn" onClick={clear} disabled={!mid}>Clear</button>
          </div>
          {msg && <div className="mono-dim" style={{ fontSize: 11, color: msg.startsWith("✓") ? "var(--green)" : "#FF3B4E" }}>{msg}</div>}
        </div>
      </div>
    </>
  );
}

function PlayerPick({ team, value, onChange }) {
  const known = team ? playersOf(team) : [];
  const isOther = value && !known.includes(value);
  return (
    <div style={{ display: "flex", gap: 6, flex: 1 }}>
      <select className="inp" style={{ flex: 1 }} value={isOther ? "__other" : value}
        onChange={e => onChange(e.target.value === "__other" ? " " : e.target.value)}>
        <option value="">Player…</option>
        {known.map(p => <option key={p} value={p}>{p}</option>)}
        <option value="__other">✎ Type a name…</option>
      </select>
      {isOther && <input className="inp left" style={{ flex: 1 }} placeholder="Player name" value={value.trim()} onChange={e => onChange(e.target.value)} autoFocus />}
    </div>
  );
}

function MatchFacts({ matches, matchName }) {
  const [mid, setMid] = useState("");
  const [goals, setGoals] = useState([]); // {side, player, minute, penalty, own}
  const [cards, setCards] = useState([]); // {side, player, minute, red}
  const [msg, setMsg] = useState(null);
  const candidates = matches.filter(m => m.h && m.a);
  const m = candidates.find(x => x.id === mid);

  const pick = async id => {
    setMid(id); setMsg(null); setGoals([]); setCards([]);
    const sb = getSupabase(); if (!sb || !id) return;
    const { data } = await sb.from("match_facts").select("data").eq("match_id", id).maybeSingle();
    if (data?.data) {
      setGoals((data.data.goals || []).map(g => ({ side: g.side || "h", player: g.scorer || "", minute: g.minute ?? "", penalty: !!g.penalty, own: !!g.own })));
      setCards((data.data.cards || []).map(c => ({ side: c.side || "h", player: c.player || "", minute: c.minute ?? "", red: c.red !== false })));
    }
  };

  const teamName = side => m ? (side === "a" ? TEAM[m.a]?.name : TEAM[m.h]?.name) : "";
  const teamId = side => m ? (side === "a" ? m.a : m.h) : null;

  const addGoal = () => setGoals(g => [...g, { side: "h", player: "", minute: "", penalty: false, own: false }]);
  const addCard = () => setCards(c => [...c, { side: "h", player: "", minute: "", red: true }]);
  const upG = (i, k, v) => setGoals(g => g.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const upC = (i, k, v) => setCards(c => c.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const rmG = i => setGoals(g => g.filter((_, j) => j !== i));
  const rmC = i => setCards(c => c.filter((_, j) => j !== i));

  const save = async () => {
    const sb = getSupabase(); if (!sb || !mid) return;
    const G = goals.filter(g => g.player.trim() && g.minute !== "").map(g => ({
      side: g.side, scorer: g.player.trim(), minute: +g.minute, penalty: !!g.penalty, own: !!g.own,
    }));
    const C = cards.filter(c => c.player.trim() && c.minute !== "").map(c => ({
      side: c.side, player: c.player.trim(), minute: +c.minute, red: !!c.red,
    }));
    if (G.length === 0 && C.length === 0) { setMsg("\u26a0 Add at least one complete goal or card row (player + minute)."); return; }
    const { error } = await sb.from("match_facts").upsert({ match_id: mid, data: { goals: G, cards: C } });
    setMsg(error ? `\u26a0 ${error.message}` : `\u2713 Saved ${G.length} goals + ${C.length} cards. Refresh the home page to see them.`);
  };

  const sideBtn = (cur, val, set, label) => (
    <button onClick={() => set(val)} className={`chip-btn${cur === val ? " on" : ""}`} style={{ fontSize: 10, padding: "5px 9px", whiteSpace: "nowrap" }}>{label}</button>
  );

  return (
    <>
      <div className="sec-h"><h2>Match facts — goals & cards</h2></div>
      <div className="card">
        <p className="body2" style={{ fontSize: 12.5, marginBottom: 12 }}>
          Add goals and cards for any match. Pick the team, choose a player (or type one), set the minute, and flag penalties / own goals / reds.
        </p>
        <select className="inp" value={mid} onChange={e => pick(e.target.value)} style={{ marginBottom: 14 }}>
          <option value="">Pick a match…</option>
          {candidates.map(mm => <option key={mm.id} value={mm.id}>{matchName(mm.id)}</option>)}
        </select>

        {mid && <>
          {/* GOALS */}
          <div className="mono-dim" style={{ fontSize: 10, letterSpacing: ".1em", marginBottom: 8 }}>⚽ GOALS</div>
          {goals.map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 7, flexWrap: "wrap" }}>
              {sideBtn(g.side, "h", v => upG(i, "side", v), teamName("h"))}
              {sideBtn(g.side, "a", v => upG(i, "side", v), teamName("a"))}
              <PlayerPick team={teamId(g.side)} value={g.player} onChange={v => upG(i, "player", v)} />
              <input className="inp" style={{ width: 64 }} placeholder="min" inputMode="numeric" value={g.minute} onChange={e => upG(i, "minute", e.target.value.replace(/[^0-9+]/g, ""))} />
              {sideBtn(g.penalty, true, () => upG(i, "penalty", !g.penalty), "PEN")}
              {sideBtn(g.own, true, () => upG(i, "own", !g.own), "OG")}
              <button onClick={() => rmG(i)} className="chip-btn" style={{ fontSize: 12, padding: "4px 9px", color: "#FF3B4E" }}>✕</button>
            </div>
          ))}
          <button className="chip-btn" onClick={addGoal} style={{ fontSize: 11, marginBottom: 16 }}>+ Add goal</button>

          {/* CARDS */}
          <div className="mono-dim" style={{ fontSize: 10, letterSpacing: ".1em", marginBottom: 8 }}>🟥 CARDS</div>
          {cards.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 7, flexWrap: "wrap" }}>
              {sideBtn(c.side, "h", v => upC(i, "side", v), teamName("h"))}
              {sideBtn(c.side, "a", v => upC(i, "side", v), teamName("a"))}
              <PlayerPick team={teamId(c.side)} value={c.player} onChange={v => upC(i, "player", v)} />
              <input className="inp" style={{ width: 64 }} placeholder="min" inputMode="numeric" value={c.minute} onChange={e => upC(i, "minute", e.target.value.replace(/[^0-9+]/g, ""))} />
              {sideBtn(c.red, true, () => upC(i, "red", true), "RED")}
              {sideBtn(!c.red, true, () => upC(i, "red", false), "YEL")}
              <button onClick={() => rmC(i)} className="chip-btn" style={{ fontSize: 12, padding: "4px 9px", color: "#FF3B4E" }}>✕</button>
            </div>
          ))}
          <button className="chip-btn" onClick={addCard} style={{ fontSize: 11, marginBottom: 16 }}>+ Add card</button>

          <div><button className="btn-g sm" onClick={save}>Save match facts</button></div>
        </>}
        {msg && <div className="mono-dim" style={{ fontSize: 11, marginTop: 10, color: msg.startsWith("\u2713") ? "var(--green)" : "#FF3B4E" }}>{msg}</div>}
      </div>
    </>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const { matches } = useMatches();

  const load = async () => {
    const sb = getSupabase();
    if (!sb) { setErr("Supabase not configured."); return; }
    try {
      const since14 = new Date(Date.now() - 14 * DAY).toISOString();
      const since5m = new Date(Date.now() - 5 * 60000).toISOString();
      const [pv14, pvAll, live, votes, preds, ballots, usage] = await Promise.all([
        sb.from("page_views").select("created_at,session").gte("created_at", since14),
        sb.from("page_views").select("*", { count: "exact", head: true }),
        sb.from("page_views").select("session").gte("created_at", since5m),
        sb.from("votes").select("match_id,pick,name"),
        sb.from("score_predictions").select("match_id,name,home,away,created_at"),
        sb.from("ballots").select("name,picks,created_at"),
        sb.from("af_usage").select("*"),
      ]);
      const firstErr = [pv14, live, votes, preds, ballots].find(r => r.error);
      if (firstErr?.error) { setErr(firstErr.error.message); return; }

      // per-day views + unique visitors (last 14 days)
      const days = {};
      for (const r of pv14.data || []) {
        const k = dayKey(r.created_at);
        days[k] = days[k] || { views: 0, sessions: new Set() };
        days[k].views++; days[k].sessions.add(r.session);
      }
      const dayRows = [];
      for (let i = 13; i >= 0; i--) {
        const k = dayKey(Date.now() - i * DAY);
        dayRows.push({ day: k, views: days[k]?.views || 0, visitors: days[k]?.sessions.size || 0 });
      }
      const todayKey = dayKey(Date.now());

      setData({
        allTimeViews: pvAll.count ?? 0,
        today: days[todayKey] ? { views: days[todayKey].views, visitors: days[todayKey].sessions.size } : { views: 0, visitors: 0 },
        liveNow: new Set((live.data || []).map(r => r.session)).size,
        dayRows,
        votes: votes.data || [],
        preds: preds.data || [],
        ballots: ballots.data || [],
        usage: usage.data || [],
        at: new Date(),
      });
      setErr(null);
    } catch (e) { setErr(String(e)); }
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  if (err) return <main className="wrap" style={{ padding: 40 }}><p style={{ color: "#FF3B4E", fontFamily: "var(--mono)", fontSize: 12 }}>⚠ {err}{err.includes("page_views") ? " — run the page_views SQL migration in Supabase." : ""}</p></main>;
  if (!data) return <main className="wrap" style={{ padding: 40 }}><p className="mono-dim">Loading dashboard…</p></main>;

  // votes grouped by match
  const byMatch = {};
  for (const v of data.votes) {
    byMatch[v.match_id] = byMatch[v.match_id] || { h: 0, d: 0, a: 0, total: 0 };
    byMatch[v.match_id][v.pick]++; byMatch[v.match_id].total++;
  }
  const matchName = id => {
    const m = matches.find(x => x.id === id);
    return m && m.h && m.a ? `${TEAM[m.h].flag} ${TEAM[m.h].name} vs ${TEAM[m.a].name} ${TEAM[m.a].flag}` : `Match ${id}`;
  };
  const players = new Set([...data.votes, ...data.preds, ...data.ballots].map(r => (r.name || "").toLowerCase()).filter(Boolean));
  const maxViews = Math.max(1, ...data.dayRows.map(r => r.views));

  return (
    <main className="wrap" style={{ padding: "30px 20px 40px" }}>
      <h1 className="h1">Dashboard <span style={{ color: "var(--green)" }}>—</span></h1>
      <p className="mono-dim" style={{ margin: "6px 0 22px" }}>AUTO-REFRESHES EVERY 30S · LAST UPDATE {data.at.toLocaleTimeString()}</p>

      <div className="grid auto-220" style={{ marginBottom: 26 }}>
        <Stat label="Live right now" value={data.liveNow} accent="var(--live)" />
        <Stat label="Visits today" value={data.today.views} accent="var(--green)" />
        <Stat label="Visitors today" value={data.today.visitors} />
        <Stat label="All-time page views" value={data.allTimeViews} accent="var(--gold)" />
      </div>

      <div className="sec-h"><h2>Visits per day</h2></div>
      <div className="card">
        {data.dayRows.map(r => (
          <div key={r.day} style={{ display: "grid", gridTemplateColumns: "64px 1fr 110px", gap: 12, alignItems: "center", padding: "5px 0", fontFamily: "var(--mono)", fontSize: 11.5 }}>
            <span style={{ color: "var(--txt3)" }}>{r.day}</span>
            <div style={{ height: 12, borderRadius: 99, background: "var(--navy1)", border: "1px solid var(--line)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(r.views / maxViews) * 100}%`, background: "linear-gradient(90deg,#1FB551,var(--green))" }} />
            </div>
            <span style={{ textAlign: "right", color: "var(--txt2)" }}>{r.views} views · {r.visitors} ppl</span>
          </div>
        ))}
      </div>

      <div className="grid auto-220" style={{ margin: "26px 0" }}>
        <Stat label="Players (named)" value={players.size} accent="var(--green)" />
        <Stat label="Match votes" value={data.votes.length} />
        <Stat label="Score predictions" value={data.preds.length} />
        <Stat label="Ballots locked" value={data.ballots.length} accent="var(--gold)" />
      </div>

      <ApiUsage rows={data.usage} />
      <Override matches={matches} matchName={matchName} />
      <MatchFacts matches={matches} matchName={matchName} />

      <div className="sec-h"><h2>Votes by match</h2></div>
      <div className="card">
        {Object.keys(byMatch).length === 0 && <p className="mono-dim">No votes yet.</p>}
        {Object.entries(byMatch).sort((a, b) => b[1].total - a[1].total).map(([id, v]) => (
          <div key={id} style={{ padding: "9px 0", borderBottom: "1px solid var(--line-soft)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              <span>{matchName(id)}</span><span className="mono-dim">{v.total} votes</span>
            </div>
            <div style={{ display: "flex", height: 10, borderRadius: 99, overflow: "hidden", border: "1px solid var(--line)" }}>
              <div style={{ width: `${(v.h / v.total) * 100}%`, background: "var(--green)" }} title={`Home ${v.h}`} />
              <div style={{ width: `${(v.d / v.total) * 100}%`, background: "#8a93b8" }} title={`Draw ${v.d}`} />
              <div style={{ width: `${(v.a / v.total) * 100}%`, background: "var(--gold)" }} title={`Away ${v.a}`} />
            </div>
            <div className="mono-dim" style={{ fontSize: 10, marginTop: 4 }}>
              <span style={{ color: "var(--green)" }}>■</span> home {v.h} &nbsp; <span style={{ color: "#8a93b8" }}>■</span> draw {v.d} &nbsp; <span style={{ color: "var(--gold)" }}>■</span> away {v.a}
            </div>
          </div>
        ))}
      </div>

      <div className="sec-h"><h2>Latest score predictions</h2></div>
      <div className="card">
        {data.preds.length === 0 && <p className="mono-dim">No score predictions yet.</p>}
        {[...data.preds].reverse().slice(0, 20).map((p, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line-soft)", fontSize: 12.5 }}>
            <span><strong>{p.name}</strong> · {matchName(p.match_id)}</span>
            <span style={{ fontFamily: "var(--mono)", color: "var(--gold)" }}>{p.home} – {p.away}</span>
          </div>
        ))}
      </div>

      <div className="sec-h"><h2>Tournament ballots</h2></div>
      <div className="card">
        {data.ballots.length === 0 && <p className="mono-dim">No ballots yet.</p>}
        {data.ballots.map((b, i) => (
          <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--line-soft)", fontSize: 12.5 }}>
            <strong>{b.name}</strong>
            <span className="body2" style={{ fontSize: 12 }}> — 🏆 {b.picks?.winner || "?"} · 👟 {b.picks?.boot || "?"} · 🅰️ {b.picks?.assists || "?"} · 🐎 {b.picks?.dark || "?"}</span>
            {b.picks?.crazy && <div className="mono-dim" style={{ fontSize: 10.5, marginTop: 2 }}>🔮 “{b.picks.crazy}”</div>}
          </div>
        ))}
      </div>
    </main>
  );
}
