'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import { TEAM } from '@/lib/teams';
import { getOutcome, scoreExactPrediction } from '@/lib/standings';

// votes table:             { match_id, pick ('h'|'d'|'a'), name }
// score_predictions table: { match_id, name, home, away }
// results table:           { match_id, home, away }
// matches come from /api/matches: { id, h, a, hs, as, status, group, ... }

function buildOutcomeLB(votes, matches) {
  // Build finished match result map: match_id -> actual outcome ('h'|'d'|'a')
  const resultMap = {};
  for (const m of matches) {
    const isFt = m.status === 'ft' || m.status === 'FT';
    if (isFt && m.hs !== null && m.as !== null) {
      resultMap[String(m.id)] = getOutcome(m.hs, m.as);
    }
  }

  const users = {};
  for (const v of votes) {
    const name = v.name?.trim();
    if (!name) continue;
    const actual = resultMap[String(v.match_id)];
    if (!users[name]) users[name] = { name, total: 0, correct: 0, points: 0 };
    if (actual !== undefined) {
      users[name].total++;
      if (v.pick === actual) {
        users[name].correct++;
        users[name].points++;
      }
    }
  }

  return Object.values(users).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const accA = a.total ? a.correct / a.total : 0;
    const accB = b.total ? b.correct / b.total : 0;
    return accB - accA;
  });
}

function buildScoreLB(preds, matches) {
  const matchMap = {};
  for (const m of matches) {
    const isFt = m.status === 'ft' || m.status === 'FT';
    if (isFt && m.hs !== null && m.as !== null) {
      matchMap[String(m.id)] = m;
    }
  }

  const users = {};
  for (const p of preds) {
    const name = p.name?.trim();
    if (!name) continue;
    const m = matchMap[String(p.match_id)];
    if (!users[name]) users[name] = { name, total: 0, exact: 0, points: 0, predictions: [] };
    if (m) {
      const pts = scoreExactPrediction(p.home, p.away, m.hs, m.as);
      users[name].total++;
      users[name].points += pts;
      if (pts === 3) users[name].exact++;
      users[name].predictions.push({
        match_id: m.id,
        home_team: TEAM[m.h]?.name || m.h,
        away_team: TEAM[m.a]?.name || m.a,
        pred_home: p.home, pred_away: p.away,
        act_home: m.hs, act_away: m.as,
        pts,
      });
    }
  }

  return Object.values(users).sort((a, b) => b.points - a.points);
}

function RankBadge({ rank }) {
  if (rank === 1) return <span style={{ fontSize: '1.1rem' }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: '1.1rem' }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: '1.1rem' }}>🥉</span>;
  return <span style={{ fontSize: 13, fontWeight: 600, color: '#5a6080' }}>{rank}</span>;
}

function Avatar({ name, size = 26 }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,#1e3a5f,#2a4d7a)',
      fontSize: size * 0.36, fontWeight: 700, color: '#a0c8ff', flexShrink: 0,
    }}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function UserModal({ user, mode, onClose }) {
  if (!user) return null;
  const accuracy = user.total > 0
    ? Math.round((mode === 'outcome' ? user.correct : user.exact) / user.total * 100)
    : 0;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0e1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.75rem', maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#9aa0b8', width: 28, height: 28, borderRadius: '50%', fontSize: 12, cursor: 'pointer' }}>x</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <Avatar name={user.name} size={48} />
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f2ff', margin: '0 0 3px' }}>{user.name}</h2>
            <p style={{ fontSize: 12, color: '#5a6080', margin: 0 }}>{mode === 'outcome' ? 'Match Outcome Predictions' : 'Exact Score Predictions'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {[
            [user.total, 'Predictions'],
            mode === 'outcome' ? [user.correct, 'Correct'] : [user.exact, 'Exact Scores'],
            [user.points, 'Points', true],
            [accuracy + '%', mode === 'outcome' ? 'Accuracy' : 'Exact Rate'],
          ].map(([val, lbl, gold]) => (
            <div key={lbl} style={{ background: gold ? 'rgba(245,197,24,0.07)' : '#131929', border: '1px solid ' + (gold ? 'rgba(245,197,24,0.25)' : 'rgba(255,255,255,0.07)'), borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 70, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: gold ? '#f5c518' : '#f0f2ff' }}>{val}</div>
              <div style={{ fontSize: 10, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>
        {mode === 'score' && user.predictions?.length > 0 && (
          <div>
            <h3 style={{ fontSize: 11, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Score Predictions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {user.predictions.map((p, i) => {
                const ptColors = { 3: '#4ade80', 2: '#f5c518', 1: '#f59e0b', 0: '#374060' };
                return (
                  <div key={i} style={{ background: '#131929', borderRadius: 6, padding: '8px 12px', borderLeft: '3px solid ' + (ptColors[p.pts] || '#374060'), display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#9aa0b8', flex: 1 }}>{p.home_team} vs {p.away_team}</span>
                    <span style={{ fontSize: 12, color: '#8a8ea8' }}>Pred: <strong style={{ color: '#dde0f0' }}>{p.pred_home}-{p.pred_away}</strong> · Actual: <strong style={{ color: '#dde0f0' }}>{p.act_home}-{p.act_away}</strong></span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ptColors[p.pts] + '22', color: ptColors[p.pts] }}>+{p.pts}pts</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderboardTable({ rows, mode, title, description, scoringKey }) {
  const [selected, setSelected] = useState(null);
  const [visible, setVisible] = useState(10);

  return (
    <section style={{ background: '#0e1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '20px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f5c518', margin: '0 0 4px' }}>{title}</h2>
          <p style={{ fontSize: 13, color: '#7a8099', margin: 0 }}>{description}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
          {scoringKey.map(([pts, label]) => (
            <span key={label} style={{ fontSize: 11, color: '#5a6080' }}>
              <strong style={{ color: '#f5c518' }}>{pts}</strong> {label}
            </span>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#4a5070', fontSize: 13 }}>
          No scored predictions yet — check back after matches finish.
        </div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {[['Rank', 56, 'center'], ['Name', null, 'left'], ['Predictions', 90, 'center'], [mode === 'outcome' ? 'Correct' : 'Exact', 72, 'center'], ['Points', 72, 'center']].map(([h, w, align]) => (
                  <th key={h} style={{ padding: '8px 16px', color: '#5a6080', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: align, width: w || 'auto' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, visible).map((row, i) => {
                const rank = i + 1;
                return (
                  <tr key={row.name} onClick={() => setSelected(row)} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', background: rank <= 3 ? 'rgba(245,197,24,0.03)' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = rank <= 3 ? 'rgba(245,197,24,0.03)' : 'transparent'}>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}><RankBadge rank={rank} /></td>
                    <td style={{ padding: '10px 16px', textAlign: 'left' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={row.name} />
                        <span style={{ fontWeight: 500, color: '#dde0f0' }}>{row.name}</span>
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', color: '#8a8ea8' }}>{row.total}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', color: '#8a8ea8' }}>{mode === 'outcome' ? row.correct : row.exact}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#f5c518', fontSize: 15 }}>{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length > visible && (
            <button onClick={() => setVisible(v => v + 10)} style={{ display: 'block', width: '100%', padding: '12px', background: 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#5a9cf5', fontSize: 13, cursor: 'pointer' }}>
              Show more ({rows.length - visible} remaining)
            </button>
          )}
        </>
      )}

      {selected && <UserModal user={selected} mode={mode} onClose={() => setSelected(null)} />}
    </section>
  );
}

export default function LeaderboardsPage() {
  const [outcomeLB, setOutcomeLB] = useState([]);
  const [scoreLB, setScoreLB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not configured');

      const [matchesRes, votesRes, predsRes] = await Promise.all([
        fetch('/api/matches').then(r => r.ok ? r.json() : []),
        supabase.from('votes').select('match_id,pick,name'),
        supabase.from('score_predictions').select('match_id,name,home,away'),
      ]);

      if (votesRes.error) throw votesRes.error;
      if (predsRes.error) throw predsRes.error;

      const matches = Array.isArray(matchesRes) ? matchesRes : [];
      setOutcomeLB(buildOutcomeLB(votesRes.data || [], matches));
      setScoreLB(buildScoreLB(predsRes.data || [], matches));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Leaderboard error:', err);
      setError(err.message || 'Failed to load leaderboards.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main style={{ minHeight: '100vh', background: '#0a0f1e', color: '#e8eaf0', fontFamily: 'Inter,system-ui,sans-serif', paddingBottom: '4rem' }}>
      <header style={{ textAlign: 'center', padding: '3rem 1.5rem 2rem', background: 'linear-gradient(180deg,#0d1428 0%,#0a0f1e 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 style={{ fontSize: 'clamp(1.8rem,5vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', background: 'linear-gradient(135deg,#f5c518 0%,#fff 60%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 6px' }}>
          Leaderboards
        </h1>
        <p style={{ color: '#7a8099', fontSize: 14, margin: '0 0 6px' }}>Updated after every completed match</p>
        {lastUpdated && (
          <p style={{ fontSize: 12, color: '#4a5070', margin: 0 }}>
            Refreshed {lastUpdated.toLocaleTimeString()} &nbsp;·&nbsp;
            <button onClick={load} style={{ background: 'none', border: 'none', color: '#5a9cf5', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Refresh</button>
          </p>
        )}
      </header>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5rem 1rem', color: '#5a6080', gap: 12 }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#f5c518', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <p style={{ margin: 0, fontSize: 14 }}>Calculating standings...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 1rem', color: '#5a6080', gap: 12 }}>
          <p style={{ color: '#f87171' }}>Failed to load: {error}</p>
          <button onClick={load} style={{ background: 'rgba(90,156,245,0.1)', border: '1px solid rgba(90,156,245,0.3)', color: '#5a9cf5', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Try again</button>
        </div>
      )}

      {!loading && !error && (
        <div style={{ maxWidth: 860, margin: '2.5rem auto 0', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <LeaderboardTable
            rows={outcomeLB}
            mode="outcome"
            title="Match Winner Leaderboard"
            description="Predict home win, draw, or away win."
            scoringKey={[['+1', 'correct outcome']]}
          />
          <LeaderboardTable
            rows={scoreLB}
            mode="score"
            title="Exact Score Leaderboard"
            description="Predict the exact scoreline. Closer guesses still earn points."
            scoringKey={[['+3', 'exact score'], ['+2', '1-goal diff'], ['+1', '2-goal diff']]}
          />
        </div>
      )}
    </main>
  );
}
