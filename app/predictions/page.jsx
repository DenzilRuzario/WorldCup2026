"use client";
import { useEffect, useState } from "react";
import { T, TEAM } from "@/lib/teams";
import { getSupabase } from "@/lib/supabase";
import { useMatches, statusOf, fmtDay, fmtTime } from "@/components/useMatches";
import Flag from "@/components/Flag";

const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/* ---------------- identity bar — one name attached to everything ---------------- */
function IdentityBar({ name, setName }) {
  const [draft, setDraft] = useState("");
  if (name) return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", marginBottom: 18 }}>
      <span style={{ fontSize: 18 }}>🎯</span>
      <span className="body2" style={{ fontSize: 13.5 }}>Playing as <strong style={{ color: "var(--green)" }}>{name}</strong> — all your picks are recorded under this name for scoring.</span>
    </div>
  );
  return (
    <div className="card" style={{ marginBottom: 18, borderColor: "rgba(52,232,107,.4)" }}>
      <div className="lbl">Step 1 — who's playing?</div>
      <p className="body2" style={{ fontSize: 13.5, margin: "4px 0 12px" }}>Enter your name once. Every vote, score call and ballot pick is stored under it so winners can be scored and announced.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
        <input className="inp left" placeholder="Your name" value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && draft.trim()) { setName(draft.trim()); } }} />
        <button className="btn-g sm" disabled={!draft.trim()} onClick={() => setName(draft.trim())}>Let's play</button>
      </div>
    </div>
  );
}

/* ---------------- PART 1 + 2 : match card (win vote + score call) ---------------- */
function PredCard({ m, now, name }) {
  const [votes, setVotes] = useState(null);
  const [myPick, setMyPick] = useState(null);
  const [score, setScore] = useState({ h: "", a: "" });
  const [scoreSaved, setScoreSaved] = useState(null); // {h,a} once locked
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const H = TEAM[m.h], A = TEAM[m.a];

  useEffect(() => {
    setMyPick(lsGet(`vote:${m.id}`));
    const prior = lsGet(`pred:${m.id}`);
    if (prior) setScoreSaved(prior);
    const sb = getSupabase();
    if (!sb) { setErr("Supabase not configured"); return; }
    (async () => {
      const { data: v, error: ve } = await sb.from("votes").select("pick").eq("match_id", m.id);
      if (ve) { setErr(ve.message); return; }
      if (v) setVotes({ h: v.filter(x => x.pick === "h").length, d: v.filter(x => x.pick === "d").length, a: v.filter(x => x.pick === "a").length });
    })();
  }, [m.id]);

  /* PART 1 — one vote, locked forever, % revealed only after */
  const vote = async k => {
    if (myPick || busy || !name) return;
    const sb = getSupabase(); if (!sb) return;
    setBusy(true);
    const { error } = await sb.from("votes").insert({ match_id: m.id, pick: k, name });
    if (!error) {
      setMyPick(k); lsSet(`vote:${m.id}`, k);
      setVotes(v => ({ ...(v || { h: 0, d: 0, a: 0 }), [k]: ((v || {})[k] || 0) + 1 }));
    } else if (error.code === "23505") {
      setErr(`"${name}" has already voted on this match.`); setMyPick(k); lsSet(`vote:${m.id}`, k);
    } else if (/column .*name/i.test(error.message)) {
      setErr("Database needs the votes.name column — run the migration SQL in Supabase.");
    } else setErr(error.message);
    setBusy(false);
  };

  /* PART 2 — exact score, once only */
  const lockScore = async () => {
    if (scoreSaved || score.h === "" || score.a === "" || busy || !name) return;
    const sb = getSupabase(); if (!sb) return;
    setBusy(true);
    const { error } = await sb.from("score_predictions").insert({ match_id: m.id, name, home: +score.h, away: +score.a });
    if (!error) {
      const saved = { name, h: +score.h, a: +score.a };
      setScoreSaved(saved); lsSet(`pred:${m.id}`, saved);
    } else if (error.code === "23505") {
      setErr(`"${name}" has already locked a score for this match.`);
      const saved = { name, h: +score.h, a: +score.a }; setScoreSaved(saved); lsSet(`pred:${m.id}`, saved);
    } else setErr(error.message);
    setBusy(false);
  };

  const total = votes ? Math.max(1, votes.h + votes.d + votes.a) : 1;
  const pct = k => Math.round(((votes?.[k] || 0) / total) * 100);
  const opts = [["h", `${m.h.toUpperCase()} WIN`], ["d", "DRAW"], ["a", `${m.a.toUpperCase()} WIN`]];

  return (
    <div className="mcard" style={{ padding: 18 }}>
      <div className="top">
        <span>{m.group ? `GROUP ${m.group}` : (m.stage || "").replace(/_/g, " ")} · {fmtDay(m.ko)} · {fmtTime(m.ko)}</span>
        <span className="mono-dim">{myPick && votes ? `${votes.h + votes.d + votes.a} VOTES` : ""}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
        <Flag id={m.h} size={40} />
        <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 14, textTransform: "uppercase" }}>{H.name}</span>
        <span className="vs">VS</span>
        <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 14, textTransform: "uppercase" }}>{A.name}</span>
        <Flag id={m.a} size={40} />
      </div>

      {err && <div style={{ background: "rgba(255,59,78,.1)", border: "1px solid rgba(255,59,78,.3)", borderRadius: 8, padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 10.5, color: "#FF3B4E" }}>⚠ {err}</div>}

      {/* PART 1 */}
      {!myPick ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {opts.map(([k, l]) => (
            <button key={k} onClick={() => vote(k)} disabled={busy || !name} className="lift"
              title={!name ? "Enter your name above first" : "One vote — it locks immediately"}
              style={{ background: "var(--navy1)", border: "1px solid var(--line)", borderRadius: 10, padding: "13px 6px", fontFamily: "var(--disp)", fontWeight: 800, fontSize: 12, letterSpacing: ".05em", color: !name ? "var(--txt3)" : "var(--txt)", cursor: !name ? "not-allowed" : busy ? "wait" : "pointer" }}>
              {busy ? "…" : l}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="mono-dim" style={{ fontSize: 9.5, letterSpacing: ".12em" }}>YOUR PICK IS LOCKED — COMMUNITY SPLIT:</div>
          {opts.map(([k, l]) => (
            <div key={k} className="vrow">
              <span style={{ color: myPick === k ? "var(--green)" : "var(--txt2)" }}>{l}{myPick === k ? " ✓" : ""}</span>
              <div className={`vbar${k === "d" ? " draw" : ""}`}><i style={{ width: `${pct(k)}%` }} /></div>
              <span style={{ textAlign: "right", fontWeight: 700, color: "var(--txt)" }}>{pct(k)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* PART 2 */}
      <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
        {scoreSaved ? (
          <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--green)", textAlign: "center" }}>
            ✓ Score locked: {scoreSaved.h} – {scoreSaved.a}
          </div>
        ) : <>
          <div className="mono-dim" style={{ letterSpacing: ".12em", marginBottom: 9, fontSize: 9.5 }}>CALL THE EXACT SCORE — ONE SHOT ONLY</div>
          <div style={{ display: "grid", gridTemplateColumns: "56px 14px 56px auto", gap: 8, alignItems: "center", justifyContent: "center" }}>
            <input className="inp" placeholder="0" inputMode="numeric" disabled={!name} value={score.h} onChange={e => setScore({ ...score, h: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
            <span style={{ textAlign: "center", color: "var(--txt3)", fontFamily: "var(--mono)" }}>:</span>
            <input className="inp" placeholder="0" inputMode="numeric" disabled={!name} value={score.a} onChange={e => setScore({ ...score, a: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
            <button className="btn-g sm" onClick={lockScore} disabled={busy || !name || score.h === "" || score.a === ""}>{busy ? "…" : "Lock in"}</button>
          </div>
        </>}
      </div>
    </div>
  );
}

/* ---------------- finished-match recap ---------------- */
function RecapCard({ m }) {
  const [preds, setPreds] = useState([]);
  useEffect(() => {
    const sb = getSupabase(); if (!sb) return;
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
        <Flag id={m.h} size={38} />
        <span style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 28 }}>{m.hs} <span style={{ color: "var(--txt3)", fontSize: 18 }}>–</span> {m.as}</span>
        <Flag id={m.a} size={38} />
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

/* ---------------- PART 3 : tournament ballot ---------------- */
const CATS = [
  ["winner",  "🏆 World Cup Winner",                 "team"],
  ["boot",    "👟 Golden Boot (top scorer)",          "text"],
  ["assists", "🅰️ Most Assists",                     "text"],
  ["young",   "🌟 Best Young Player (under 23)",      "text"],
  ["potm",    "👑 Player of the Tournament",          "text"],
  ["dark",    "🐎 Dark Horse",                        "team"],
  ["exit",    "💥 Surprise Early Exit",               "team"],
  ["crazy",   "🔮 One Crazy Prediction",              "long"],
];

function Ballot({ name }) {
  const [picks, setPicks] = useState({});
  const [all, setAll] = useState(null);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (lsGet("ballotDone")) setDone(true);
    const sb = getSupabase();
    if (!sb) { setErr("Supabase not configured — check Vercel env vars."); return; }
    (async () => {
      const { data, error } = await sb.from("ballots").select("name,picks").order("created_at");
      if (error) setErr(error.message); else setAll(data);
    })();
  }, []);

  const filled = CATS.filter(([k]) => picks[k] && String(picks[k]).trim()).length;

  const submit = async () => {
    if (!name || filled < CATS.length) return;
    const sb = getSupabase(); if (!sb) return;
    const { error } = await sb.from("ballots").insert({ name, picks });
    if (!error) {
      setDone(true); lsSet("ballotDone", name);
      setAll(a => [...(a || []), { name, picks }]);
    } else if (error.code === "23505") {
      setErr(`A ballot under the name "${name}" already exists.`); setDone(true); lsSet("ballotDone", name);
    } else setErr(error.message);
  };

  if (done) return (
    <div className="card" style={{ textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
      <div style={{ fontFamily: "var(--disp)", fontWeight: 900, fontSize: 20, textTransform: "uppercase" }}>Ballot locked{name ? `, ${name}` : ""}!</div>
      <p className="body2" style={{ marginTop: 8 }}>All picks are stored for scoring. Winners get announced when the trophy is lifted on July 19.</p>
      {all && all.length > 0 && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--line-soft)", paddingTop: 12, textAlign: "left" }}>
          <div className="mono-dim" style={{ letterSpacing: ".12em", marginBottom: 8, fontSize: 9.5 }}>{all.length} BALLOT{all.length > 1 ? "S" : ""} IN</div>
          <p className="body2" style={{ fontSize: 12.5 }}>{all.map(b => `${b.name}${b.picks?.winner ? ` (🏆 ${b.picks.winner})` : ""}`).join(" · ")}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 15, textTransform: "uppercase", letterSpacing: ".06em" }}>
          Tournament Ballot <span style={{ color: "var(--green)" }}>—</span>
        </div>
        <span className="mono-dim">{filled}/{CATS.length} PICKED{all ? ` · ${all.length} BALLOTS IN` : ""}</span>
      </div>
      <p className="body2" style={{ fontSize: 12.5, marginBottom: 16 }}>All {CATS.length} picks required. One ballot per person — it locks on submit.</p>

      {err && <div style={{ background: "rgba(255,59,78,.1)", border: "1px solid rgba(255,59,78,.3)", borderRadius: 8, padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 10.5, color: "#FF3B4E", marginBottom: 14 }}>⚠ {err}</div>}

      <div className="grid auto-240" style={{ gap: 12 }}>
        {CATS.map(([k, label, kind]) => (
          <div key={k} style={kind === "long" ? { gridColumn: "1 / -1" } : undefined}>
            <div className="mono-dim" style={{ letterSpacing: ".08em", color: "var(--txt2)", marginBottom: 6, fontSize: 10 }}>{label}</div>
            {kind === "team" ? (
              <select className="inp" value={picks[k] || ""} onChange={e => setPicks({ ...picks, [k]: e.target.value })}>
                <option value="">Pick a team…</option>
                {T.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            ) : kind === "long" ? (
              <input className="inp left" maxLength={140} placeholder="Go wild — e.g. 'New Zealand reach the quarter-finals'" value={picks[k] || ""} onChange={e => setPicks({ ...picks, [k]: e.target.value })} />
            ) : (
              <input className="inp left" placeholder="Player name…" value={picks[k] || ""} onChange={e => setPicks({ ...picks, [k]: e.target.value })} />
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <button className="btn-g" onClick={submit} disabled={!name || filled < CATS.length}
          title={!name ? "Enter your name at the top first" : filled < CATS.length ? "Fill in all picks" : "Lock it in"}>
          {name ? `Lock my ballot as ${name}` : "Enter your name above to play"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */
export default function Predictions() {
  const { matches, loading } = useMatches();
  const [tab, setTab] = useState("up");
  const [name, setNameState] = useState("");
  useEffect(() => { setNameState(lsGet("myname") || ""); }, []);
  const setName = n => { setNameState(n); lsSet("myname", n); };

  const now = new Date();
  const allUp = matches.filter(m => statusOf(m, now) === "up" && m.h && m.a);
  // Predictions open only for the next matchday (e.g. Matchday 1 while it's in progress)
  const mds = allUp.map(m => m.matchday).filter(x => x != null);
  const nextMd = mds.length ? Math.min(...mds) : null;
  const up = nextMd != null ? allUp.filter(m => m.matchday === nextMd) : allUp.slice(0, 10);
  const done = matches.filter(m => statusOf(m, now) === "ft" && m.h && m.a && m.hs !== null).slice(-9).reverse();
  const configured = !!getSupabase();

  return (
    <main className="wrap" style={{ padding: "30px 20px 40px" }}>
      <h1 className="h1">Call It <span style={{ color: "var(--green)" }}>—</span></h1>
      <p className="body2" style={{ fontSize: 14, margin: "6px 0 18px" }}>
        Three games: pick winners, call exact scores, and lock your tournament ballot. Every pick is recorded for scoring — winners announced after the final.
      </p>

      {!configured && (
        <div style={{ background: "rgba(255,59,78,.1)", border: "1px solid rgba(255,59,78,.35)", borderRadius: 10, padding: "12px 16px", fontFamily: "var(--mono)", fontSize: 11, color: "#FF3B4E", marginBottom: 18 }}>
          ⚠ Predictions are offline: Supabase environment variables are missing from this deployment. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables, then redeploy.
        </div>
      )}

      <IdentityBar name={name} setName={setName} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["up", "Match Predictions"], ["ft", "Results"], ["ballot", "Tournament Ballot"]].map(([k, l]) => (
          <button key={k} className={`chip-btn${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "up" && (loading ? <p className="mono-dim">Loading fixtures…</p> : <>
        {nextMd != null && (
          <div className="mono-dim" style={{ marginBottom: 14, fontSize: 11, letterSpacing: ".1em" }}>
            ⚽ PREDICTIONS OPEN FOR MATCHDAY {nextMd} ONLY — LATER ROUNDS UNLOCK AS THE TOURNAMENT PROGRESSES
          </div>
        )}
        <div className="grid auto-300">{up.map(m => <PredCard key={m.id} m={m} now={now} name={name} />)}</div>
      </>)}
      {tab === "ft" && (done.length
        ? <div className="grid auto-300">{done.map(m => <RecapCard key={m.id} m={m} />)}</div>
        : <p className="mono-dim">No finished matches yet — recaps appear here after full time.</p>)}
      {tab === "ballot" && <Ballot name={name} />}
    </main>
  );
}
