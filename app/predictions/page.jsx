"use client";
import { useEffect, useState } from "react";
import { T, TEAM } from "@/lib/teams";
import { getSupabase } from "@/lib/supabase";
import { useMatches, statusOf, fmtDay, fmtTime } from "@/components/useMatches";

const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/* ---------- match prediction card ---------- */
function PredCard({ m, now }) {
  const [votes, setVotes]       = useState(null);
  const [predCount, setPredCount] = useState(0);
  const [myPick, setMyPick]     = useState(null);
  const [form, setForm]         = useState({ name: "", h: "", a: "" });
  const [saved, setSaved]       = useState(false);
  const [busy, setBusy]         = useState(false);
  const [sbErr, setSbErr]       = useState(null);
  const H = TEAM[m.h], A = TEAM[m.a];

  useEffect(() => {
    setMyPick(lsGet(`vote:${m.id}`));
    setForm(f => ({ ...f, name: lsGet("myname") || "" }));
    const sb = getSupabase();
    if (!sb) { setSbErr("Supabase not configured"); return; }
    (async () => {
      const { data: v, error: ve } = await sb.from("votes").select("pick").eq("match_id", m.id);
      if (ve) { setSbErr(ve.message); return; }
      if (v) setVotes({ h: v.filter(x => x.pick === "h").length, d: v.filter(x => x.pick === "d").length, a: v.filter(x => x.pick === "a").length });
      const { count } = await sb.from("score_predictions").select("*", { count: "exact", head: true }).eq("match_id", m.id);
      setPredCount(count || 0);
    })();
  }, [m.id]);

  const vote = async k => {
    if (myPick || busy) return;
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb.from("votes").insert({ match_id: m.id, pick: k });
    if (!error) {
      setMyPick(k);
      lsSet(`vote:${m.id}`, k);
      setVotes(v => ({ ...(v || { h: 0, d: 0, a: 0 }), [k]: ((v || {})[k] || 0) + 1 }));
    } else {
      setSbErr(error.message);
    }
    setBusy(false);
  };

  const lockScore = async () => {
    if (!form.name.trim() || form.h === "" || form.a === "" || busy) return;
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb.from("score_predictions").insert({
      match_id: m.id,
      name: form.name.trim(),
      home: +form.h,
      away: +form.a,
    });
    if (!error) {
      setSaved(true);
      lsSet("myname", form.name.trim());
      setPredCount(c => c + 1);
    } else {
      setSbErr(error.message);
    }
    setBusy(false);
  };

  const total = votes ? Math.max(1, votes.h + votes.d + votes.a) : 1;
  const pct = k => Math.round(((votes?.[k] || 0) / total) * 100);
  const opts = [["h", `${m.h.toUpperCase()} WIN`], ["d", "DRAW"], ["a", `${m.a.toUpperCase()} WIN`]];

  return (
    <div className="mcard" style={{ padding: 18 }}>
      <div className="top">
        <span>{m.group ? `GROUP ${m.group}` : (m.stage || "").replace(/_/g, " ")} · {fmtDay(m.ko)} · {fmtTime(m.ko)}</span>
        <span className="mono-dim">{votes && (votes.h + votes.d + votes.a) > 0 ? `${votes.h + votes.d + votes.a} VOTES` : "BE FIRST TO VOTE"}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 28 }}>{H.flag}</span>
        <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 14, textTransform: "uppercase" }}>{H.name}</span>
        <span className="vs">VS</span>
        <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 14, textTransform: "uppercase" }}>{A.name}</span>
        <span style={{ fontSize: 28 }}>{A.flag}</span>
      </div>

      {sbErr && (
        <div style={{ background: "rgba(255,59,78,.1)", border: "1px solid rgba(255,59,78,.3)", borderRadius: 8, padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 10.5, color: "#FF3B4E" }}>
          ⚠ {sbErr}
        </div>
      )}

      {!myPick ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {opts.map(([k, l]) => (
            <button key={k} onClick={() => vote(k)} disabled={busy} className="lift"
              style={{ background: "var(--navy1)", border: "1px solid var(--line)", borderRadius: 10, padding: "13px 6px", fontFamily: "var(--disp)", fontWeight: 800, fontSize: 12, letterSpacing: ".05em", color: "var(--txt)", cursor: busy ? "wait" : "pointer" }}>
              {busy ? "…" : l}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {opts.map(([k, l]) => (
            <div key={k} className="vrow">
              <span style={{ color: myPick === k ? "var(--green)" : "var(--txt2)" }}>{l}{myPick === k ? " ✓" : ""}</span>
              <div className={`vbar${k === "d" ? " draw" : ""}`}><i style={{ width: `${pct(k)}%` }} /></div>
              <span style={{ textAlign: "right", fontWeight: 700, color: "var(--txt)" }}>{pct(k)}%</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
        {saved ? (
          <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--green)", textAlign: "center" }}>
            ✓ Score locked in — good luck, {form.name}!
          </div>
        ) : <>
          <div className="mono-dim" style={{ letterSpacing: ".12em", marginBottom: 9, fontSize: 9.5 }}>CALL THE EXACT SCORE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 14px 56px auto", gap: 8, alignItems: "center" }}>
            <input className="inp left" placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="inp" placeholder="0" inputMode="numeric" value={form.h} onChange={e => setForm({ ...form, h: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
            <span style={{ textAlign: "center", color: "var(--txt3)", fontFamily: "var(--mono)" }}>:</span>
            <input className="inp" placeholder="0" inputMode="numeric" value={form.a} onChange={e => setForm({ ...form, a: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
            <button className="btn-g sm" onClick={lockScore} disabled={busy}>{busy ? "…" : "Lock in"}</button>
          </div>
          {predCount > 0 && <div className="mono-dim" style={{ marginTop: 8 }}>{predCount} score prediction{predCount > 1 ? "s" : ""} so far</div>}
        </>}
      </div>
    </div>
  );
}

/* ---------- finished-match recap ---------- */
function RecapCard({ m }) {
  const [preds, setPreds] = useState([]);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    (async () => {
      const { data } = await sb.from("score_predictions").select("name,home,away").eq("match_id", m.id);
      if (data) setPreds(data);
    })();
  }, [m.id]);
  const H = TEAM[m.h], A = TEAM[m.a];
  const exact = preds.filter(p => p.home === m.hs && p.away === m.as);
  const res = (h, a) => h > a ? "h" : h < a ? "a" : "d";
  const closest = preds
    .filter(p => !(p.home === m.hs && p.away === m.as) && res(p.home, p.away) === res(m.hs, m.as))
    .map(p => ({ ...p, diff: Math.abs(p.home - m.hs) + Math.abs(p.away - m.as) }))
    .sort((x, y) => x.diff - y.diff).slice(0, 3);
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span className="mono-dim">{m.group ? `GROUP ${m.group}` : ""} · FULL TIME</span>
        <span className="badge ft">FT</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 14 }}>
        <span style={{ fontSize: 26 }}>{H.flag}</span>
        <span style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 28 }}>{m.hs} <span style={{ color: "var(--txt3)", fontSize: 18 }}>–</span> {m.as}</span>
        <span style={{ fontSize: 26 }}>{A.flag}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: "var(--navy1)", border: "1px solid var(--line)", borderRadius: 10, padding: 11 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".12em", color: "var(--green)", marginBottom: 6 }}>✓ CALLED IT — EXACT</div>
          <p className="body2" style={{ fontSize: 12.5 }}>{exact.length ? exact.map(p => p.name).join(" · ") : "Nobody — it surprised everyone."}</p>
        </div>
        <div style={{ background: "var(--navy1)", border: "1px solid var(--line)", borderRadius: 10, padding: 11 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".12em", color: "var(--gold)", marginBottom: 6 }}>◎ CLOSEST</div>
          <p className="body2" style={{ fontSize: 12.5 }}>{closest.length ? closest.map(p => `${p.name} (${p.home}–${p.away})`).join(" · ") : "No close calls this time."}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- tournament ballot ---------- */
const CATS = [
  ["winner",   "🏆 World Cup winner",         "team"],
  ["runnerup", "🥈 Runner-up",                "team"],
  ["boot",     "👟 Golden Boot",              "text"],
  ["young",    "🌟 Best Young Player",        "text"],
  ["potm",     "👑 Player of the Tournament", "text"],
  ["dark",     "🐎 Dark Horse",               "team"],
  ["exit",     "💥 Surprise early exit",      "team"],
  ["breakout", "🚀 Breakout star",            "text"],
  ["fun",      "🎪 Most entertaining team",   "team"],
  ["shock",    "⚡ Biggest tournament shock", "text"],
];

function Ballot() {
  const [picks, setPicks] = useState({});
  const [name, setName]   = useState("");
  const [all, setAll]     = useState(null);
  const [done, setDone]   = useState(false);
  const [sbErr, setSbErr] = useState(null);

  useEffect(() => {
    setName(lsGet("myname") || "");
    const sb = getSupabase();
    if (!sb) { setSbErr("Supabase not configured — check Vercel env vars."); return; }
    (async () => {
      const { data, error } = await sb.from("ballots").select("name,picks").order("created_at");
      if (error) setSbErr(error.message);
      else setAll(data);
    })();
  }, []);

  const filled = Object.values(picks).filter(v => v && String(v).trim()).length;

  const submit = async () => {
    if (!name.trim()) return;
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from("ballots").insert({ name: name.trim(), picks });
    if (!error) {
      setDone(true);
      lsSet("myname", name.trim());
      setAll(a => [...(a || []), { name: name.trim(), picks }]);
    } else {
      setSbErr(error.message);
    }
  };

  if (done) return (
    <div className="card" style={{ textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
      <div style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 20, textTransform: "uppercase" }}>Ballot locked, {name}!</div>
      <p className="body2" style={{ marginTop: 8 }}>Your calls are in with {all ? all.length - 1 : "the"} other ballots. Bragging rights settle on July 19.</p>
    </div>
  );

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 15, textTransform: "uppercase", letterSpacing: ".06em" }}>
          Tournament Ballot <span style={{ color: "var(--green)" }}>—</span>
        </div>
        <span className="mono-dim">{filled}/10 PICKED{all ? ` · ${all.length} BALLOTS IN` : ""}</span>
      </div>

      {sbErr && (
        <div style={{ background: "rgba(255,59,78,.1)", border: "1px solid rgba(255,59,78,.3)", borderRadius: 8, padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 10.5, color: "#FF3B4E", marginBottom: 14 }}>
          ⚠ {sbErr}
        </div>
      )}

      <div className="grid auto-240" style={{ gap: 12 }}>
        {CATS.map(([k, label, kind]) => (
          <div key={k}>
            <div className="mono-dim" style={{ letterSpacing: ".08em", color: "var(--txt2)", marginBottom: 6, fontSize: 10 }}>{label}</div>
            {kind === "team" ? (
              <select className="inp" value={picks[k] || ""} onChange={e => setPicks({ ...picks, [k]: e.target.value })}>
                <option value="">Pick a team…</option>
                {T.map(t => <option key={t.id} value={t.name}>{t.flag} {t.name}</option>)}
              </select>
            ) : (
              <input className="inp left" placeholder="Type a name…" value={picks[k] || ""} onChange={e => setPicks({ ...picks, [k]: e.target.value })} />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginTop: 18, alignItems: "center" }}>
        <input className="inp left" placeholder="Sign your ballot — your name" value={name} onChange={e => setName(e.target.value)} />
        <button className="btn-g" onClick={submit} disabled={!name.trim() || filled < 3}>Lock my ballot</button>
      </div>

      {all && all.length > 0 && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--line-soft)", paddingTop: 12 }}>
          <div className="mono-dim" style={{ letterSpacing: ".12em", marginBottom: 8, fontSize: 9.5 }}>BALLOTS ALREADY IN</div>
          <p className="body2" style={{ fontSize: 12.5 }}>{all.map(b => `${b.name}${b.picks?.winner ? ` (🏆 ${b.picks.winner})` : ""}`).join(" · ")}</p>
        </div>
      )}
    </div>
  );
}

/* ---------- page ---------- */
export default function Predictions() {
  const { matches, loading } = useMatches();
  const [tab, setTab] = useState("up");
  const now = new Date();
  const up   = matches.filter(m => statusOf(m, now) === "up").slice(0, 10);
  const done = matches.filter(m => statusOf(m, now) === "ft" && m.hs !== null).slice(-9).reverse();

  return (
    <main className="wrap" style={{ padding: "30px 20px 40px" }}>
      <h1 className="h1">Call It <span style={{ color: "var(--green)" }}>—</span></h1>
      <p className="body2" style={{ fontSize: 14, margin: "6px 0 18px" }}>
        Vote on matches, lock exact scores, and sign the tournament ballot. Everything you submit is visible to everyone.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["up", "Upcoming"], ["ft", "Finished"], ["ballot", "Tournament ballot"]].map(([k, l]) => (
          <button key={k} className={`chip-btn${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "up"     && (loading ? <p className="mono-dim">Loading fixtures…</p> : <div className="grid auto-300">{up.map(m => <PredCard key={m.id} m={m} now={now} />)}</div>)}
      {tab === "ft"     && (done.length ? <div className="grid auto-300">{done.map(m => <RecapCard key={m.id} m={m} />)}</div> : <p className="mono-dim">No finished matches yet — recaps appear here after full time.</p>)}
      {tab === "ballot" && <Ballot />}
    </main>
  );
}
