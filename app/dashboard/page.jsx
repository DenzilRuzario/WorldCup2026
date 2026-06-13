"use client";
import { useEffect, useState } from "react";
import { TEAM } from "@/lib/teams";
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

function MatchFacts({ matches, matchName }) {
  const [mid, setMid] = useState("");
  const [goals, setGoals] = useState("");
  const [cards, setCards] = useState("");
  const [msg, setMsg] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const candidates = matches.filter(m => m.h && m.a);

  // load existing facts when a match is picked
  const pick = async id => {
    setMid(id); setMsg(null); setLoaded(false);
    setGoals(""); setCards("");
    const sb = getSupabase(); if (!sb || !id) return;
    const { data } = await sb.from("match_facts").select("data").eq("match_id", id).maybeSingle();
    if (data?.data) {
      const g = (data.data.goals || []).map(x => `${x.side === "a" ? "A" : "H"} ${x.scorer} ${x.minute}${x.penalty ? " P" : ""}${x.own ? " OG" : ""}`).join("\n");
      const c = (data.data.cards || []).map(x => `${x.side === "a" ? "A" : "H"} ${x.player} ${x.minute}${x.red ? " R" : " Y"}`).join("\n");
      setGoals(g); setCards(c);
    }
    setLoaded(true);
  };

  // parse "H Scorer 67 [P|OG]" lines
  const parseGoals = txt => txt.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const parts = l.split(/\s+/);
    const side = /^a$/i.test(parts[0]) ? "a" : "h";
    const rest = /^[ha]$/i.test(parts[0]) ? parts.slice(1) : parts;
    const flags = rest.filter(t => /^(P|OG)$/i.test(t));
    const core = rest.filter(t => !/^(P|OG)$/i.test(t));
    const minTok = core[core.length - 1];
    const mm = (minTok || "").match(/(\d+)(?:\+(\d+))?/);
    const scorer = core.slice(0, -1).join(" ");
    return { side, scorer, minute: mm ? +mm[1] : null, extra: mm && mm[2] ? +mm[2] : null,
      penalty: flags.some(f => /^P$/i.test(f)), own: flags.some(f => /^OG$/i.test(f)) };
  }).filter(g => g.scorer);

  const parseCards = txt => txt.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const parts = l.split(/\s+/);
    const side = /^a$/i.test(parts[0]) ? "a" : "h";
    const rest = /^[ha]$/i.test(parts[0]) ? parts.slice(1) : parts;
    const red = rest.some(t => /^R$/i.test(t));
    const core = rest.filter(t => !/^[RY]$/i.test(t));
    const minTok = core[core.length - 1];
    const mm = (minTok || "").match(/(\d+)(?:\+(\d+))?/);
    const player = core.slice(0, -1).join(" ");
    return { side, player, minute: mm ? +mm[1] : null, extra: mm && mm[2] ? +mm[2] : null, red };
  }).filter(c => c.player);

  const save = async () => {
    const sb = getSupabase(); if (!sb || !mid) return;
    const payload = { goals: parseGoals(goals), cards: parseCards(cards) };
    const { error } = await sb.from("match_facts").upsert({ match_id: mid, data: payload });
    setMsg(error ? `\u26a0 ${error.message}` : `\u2713 Saved for match_id="${mid}": ${payload.goals.length} goals, ${payload.cards.length} cards.`);
  };

  return (
    <>
      <div className="sec-h"><h2>Match facts — goals & cards</h2></div>
      <div className="card">
        <p className="body2" style={{ fontSize: 12.5, marginBottom: 10 }}>
          Manually enter goalscorers and cards (zero API cost, permanent). One per line.
          Start each line with <strong>H</strong> (home) or <strong>A</strong> (away).
          Goals: <code>H Quiñones 9</code> · add <code>P</code> for penalty, <code>OG</code> for own goal.
          Cards: <code>A Sithole 50 R</code> (<code>R</code> = red, <code>Y</code> = yellow).
        </p>
        <select className="inp" value={mid} onChange={e => pick(e.target.value)} style={{ marginBottom: 10 }}>
          <option value="">Pick a match…</option>
          {candidates.map(m => <option key={m.id} value={m.id}>{matchName(m.id)}</option>)}
        </select>
        {mid && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div className="mono-dim" style={{ fontSize: 9.5, marginBottom: 4 }}>GOALS</div>
            <textarea className="inp left" rows={5} placeholder={"H Quiñones 9\nH Jiménez 67"} value={goals} onChange={e => setGoals(e.target.value)} style={{ fontFamily: "var(--mono)", resize: "vertical" }} />
          </div>
          <div>
            <div className="mono-dim" style={{ fontSize: 9.5, marginBottom: 4 }}>CARDS</div>
            <textarea className="inp left" rows={5} placeholder={"H Montes 90+2 R\nA Sithole 50 R"} value={cards} onChange={e => setCards(e.target.value)} style={{ fontFamily: "var(--mono)", resize: "vertical" }} />
          </div>
        </div>}
        {mid && <button className="btn-g sm" onClick={save} style={{ marginTop: 10 }}>Save match facts</button>}
        {msg && <div className="mono-dim" style={{ fontSize: 11, marginTop: 8, color: msg.startsWith("\u2713") ? "var(--green)" : "#FF3B4E" }}>{msg}</div>}
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
