'use client';

// app/leaderboards/page.js
// Prediction Leaderboards - computed from Supabase votes + results tables.
// No extra API calls. All calculations happen client-side from stored data.

import { getSupabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { scoreExactPrediction, getOutcome } from '@/lib/standings';

// --- Score prediction leaderboard utils -------------------------------------

function buildOutcomeLB(votes, results) {
  // votes row: { user_name, match_id, vote } where vote is 'home'|'draw'|'away'
  // results row: { match_id, home_score, away_score, status, home_team, away_team }
  const resultMap = {};
  for (const r of results) {
    if (!['FT','AET','PEN','ft','aet','pen'].includes(r.status)) continue;
    resultMap[r.match_id] = getOutcome(Number(r.home_score), Number(r.away_score));
  }

  const users = {}; // name ? { name, total, correct }
  for (const v of votes) {
    const name = v.user_name?.trim();
    if (!name) continue;
    const actual = resultMap[v.match_id];
    if (!users[name]) users[name] = { name, total: 0, correct: 0, points: 0 };
    if (actual !== undefined) {
      users[name].total++;
      if (v.vote === actual) {
        users[name].correct++;
        users[name].points++;
      }
    }
  }

  return Object.values(users).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.correct / (b.total || 1) - a.correct / (a.total || 1);
  });
}

function buildScoreLB(scorePredictions, results) {
  // score_predictions row: { user_name, match_id, home_score, away_score }
  const resultMap = {};
  for (const r of results) {
    if (!['FT','AET','PEN','ft','aet','pen'].includes(r.status)) continue;
    resultMap[r.match_id] = r;
  }

  const users = {};
  for (const p of scorePredictions) {
    const name = p.user_name?.trim();
    if (!name) continue;
    const actual = resultMap[p.match_id];
    if (!users[name]) {
      users[name] = { name, total: 0, exact: 0, close: 0, points: 0, predictions: [] };
    }
    if (actual !== undefined) {
      const pts = scoreExactPrediction(p.home_score, p.away_score, actual.home_score, actual.away_score);
      users[name].total++;
      users[name].points += pts;
      if (pts === 3) users[name].exact++;
      if (pts >= 2) users[name].close++;
      users[name].predictions.push({
        match_id: p.match_id,
        home_team: actual.home_team,
        away_team: actual.away_team,
        pred_home: p.home_score,
        pred_away: p.away_score,
        act_home: actual.home_score,
        act_away: actual.away_score,
        pts,
      });
    }
  }

  return Object.values(users).sort((a, b) => b.points - a.points);
}

// --- Rank badge --------------------------------------------------------------

function RankBadge({ rank }) {
  if (rank === 1) return <span className="rank-badge rank-gold">?</span>;
  if (rank === 2) return <span className="rank-badge rank-silver">?</span>;
  if (rank === 3) return <span className="rank-badge rank-bronze">?</span>;
  return <span className="rank-badge rank-num">{rank}</span>;
}

// --- User Profile Modal ------------------------------------------------------

function UserModal({ user, mode, onClose }) {
  if (!user) return null;

  const accuracy = user.total > 0
    ? Math.round((mode === 'outcome' ? user.correct : user.exact) / user.total * 100)
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">?</button>
        <div className="modal-header">
          <div className="modal-avatar">{user.name.slice(0,2).toUpperCase()}</div>
          <div>
            <h2 className="modal-name">{user.name}</h2>
            <p className="modal-type">
              {mode === 'outcome' ? 'Match Outcome Predictor' : 'Exact Score Predictor'}
            </p>
          </div>
        </div>

        <div className="modal-stats">
          <div className="stat-chip">
            <span className="stat-val">{user.total}</span>
            <span className="stat-lbl">Predictions</span>
          </div>
          {mode === 'outcome' ? (
            <div className="stat-chip">
              <span className="stat-val">{user.correct}</span>
              <span className="stat-lbl">Correct Outcomes</span>
            </div>
          ) : (
            <>
              <div className="stat-chip">
                <span className="stat-val">{user.exact}</span>
                <span className="stat-lbl">Exact Scores</span>
              </div>
              <div className="stat-chip">
                <span className="stat-val">{user.close}</span>
                <span className="stat-lbl">Near Misses (2pts)</span>
              </div>
            </>
          )}
          <div className="stat-chip stat-chip--pts">
            <span className="stat-val">{user.points}</span>
            <span className="stat-lbl">Total Points</span>
          </div>
          <div className="stat-chip">
            <span className="stat-val">{accuracy}%</span>
            <span className="stat-lbl">
              {mode === 'outcome' ? 'Accuracy' : 'Exact Rate'}
            </span>
          </div>
        </div>

        {mode === 'score' && user.predictions?.length > 0 && (
          <div className="modal-preds">
            <h3 className="modal-preds-title">Score Predictions</h3>
            <div className="preds-list">
              {user.predictions.map((p, i) => (
                <div key={i} className={`pred-row pred-pts-${p.pts}`}>
                  <span className="pred-teams">
                    {p.home_team} vs {p.away_team}
                  </span>
                  <span className="pred-scores">
                    <span className="pred-label">Predicted:</span>{' '}
                    <strong>{p.pred_home}-{p.pred_away}</strong>
                    {' ? '}
                    <span className="pred-label">Actual:</span>{' '}
                    <strong>{p.act_home}-{p.act_away}</strong>
                  </span>
                  <span className={`pred-pts pts-${p.pts}`}>+{p.pts}pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Leaderboard Table --------------------------------------------------------

function LeaderboardTable({ rows, mode, title, description }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [visibleCount, setVisibleCount] = useState(10);

  const visible = rows.slice(0, visibleCount);

  return (
    <section className="lb-section">
      <div className="lb-header">
        <div>
          <h2 className="lb-title">{title}</h2>
          <p className="lb-desc">{description}</p>
        </div>
        {mode === 'outcome' && (
          <div className="lb-scoring-key">
            <span className="scoring-rule"><span className="sr-pts">+1</span> Correct outcome</span>
          </div>
        )}
        {mode === 'score' && (
          <div className="lb-scoring-key">
            <span className="scoring-rule"><span className="sr-pts">+3</span> Exact score</span>
            <span className="scoring-rule"><span className="sr-pts">+2</span> 1-goal diff</span>
            <span className="scoring-rule"><span className="sr-pts">+1</span> 2-goal diff</span>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="lb-empty">
          <p>No results to score yet - check back after matches are played.</p>
        </div>
      ) : (
        <>
          <div className="lb-table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th className="lth lth-rank">Rank</th>
                  <th className="lth lth-name">Name</th>
                  {mode === 'outcome' ? (
                    <>
                      <th className="lth lth-num">Predictions</th>
                      <th className="lth lth-num">Correct</th>
                    </>
                  ) : (
                    <>
                      <th className="lth lth-num">Predictions</th>
                      <th className="lth lth-num">Exact</th>
                    </>
                  )}
                  <th className="lth lth-pts">Points</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => {
                  const rank = i + 1;
                  const isTop3 = rank <= 3;
                  return (
                    <tr
                      key={row.name}
                      className={`lb-row ${isTop3 ? 'lb-row--top' : ''}`}
                      onClick={() => setSelectedUser({ user: row, mode })}
                      style={{ cursor: 'pointer' }}
                      title="Click to view profile"
                    >
                      <td className="ltd ltd-rank">
                        <RankBadge rank={rank} />
                      </td>
                      <td className="ltd ltd-name">
                        <span className="lb-avatar">{row.name.slice(0,2).toUpperCase()}</span>
                        {row.name}
                      </td>
                      <td className="ltd ltd-num">{row.total}</td>
                      <td className="ltd ltd-num">
                        {mode === 'outcome' ? row.correct : row.exact}
                      </td>
                      <td className="ltd ltd-pts">{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rows.length > visibleCount && (
            <button
              className="show-more-btn"
              onClick={() => setVisibleCount((n) => n + 10)}
            >
              Show more ({rows.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}

      {selectedUser && (
        <UserModal
          user={selectedUser.user}
          mode={selectedUser.mode}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </section>
  );
}

// --- Page ---------------------------------------------------------------------

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

      // Fetch all three tables in parallel
      const [votesRes, predsRes, resultsRes] = await Promise.all([
        supabase.from('votes').select('user_name, match_id, vote'),
        supabase.from('score_predictions').select('user_name, match_id, home_score, away_score'),
        supabase
          .from('results')
          .select('match_id, home_team, away_team, home_score, away_score, status'),
      ]);

      if (votesRes.error) throw votesRes.error;
      if (predsRes.error) throw predsRes.error;
      if (resultsRes.error) throw resultsRes.error;

      const results = resultsRes.data || [];
      setOutcomeLB(buildOutcomeLB(votesRes.data || [], results));
      setScoreLB(buildScoreLB(predsRes.data || [], results));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Leaderboard load error:', err);
      setError(err.message || 'Failed to load leaderboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <style>{STYLES}</style>
      <main className="lb-page">
        <header className="lb-hero">
          <h1 className="lb-hero-title">Leaderboards</h1>
          <p className="lb-hero-sub">
            Updated after every completed match
          </p>
          {lastUpdated && (
            <p className="lb-updated">
              Last refreshed: {lastUpdated.toLocaleTimeString()}
              {' ? '}
              <button className="refresh-btn" onClick={load}>Refresh</button>
            </p>
          )}
        </header>

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Calculating standings?</p>
          </div>
        )}

        {error && !loading && (
          <div className="error-state">
            <p>?? {error}</p>
            <button className="retry-btn" onClick={load}>Try again</button>
          </div>
        )}

        {!loading && !error && (
          <div className="lb-content">
            <LeaderboardTable
              rows={outcomeLB}
              mode="outcome"
              title="? Match Winner Leaderboard"
              description="Predict the match outcome - home win, draw, or away win. +1 point per correct call."
            />
            <LeaderboardTable
              rows={scoreLB}
              mode="score"
              title="? Exact Score Leaderboard"
              description="Predict the exact scoreline. Closer guesses still earn points."
            />
          </div>
        )}
      </main>
    </>
  );
}

// --- Styles -------------------------------------------------------------------

const STYLES = `
  .lb-page {
    min-height: 100vh;
    background: #0a0f1e;
    color: #e8eaf0;
    font-family: 'Inter', system-ui, sans-serif;
    padding-bottom: 4rem;
  }

  /* Hero */
  .lb-hero {
    text-align: center;
    padding: 3rem 1.5rem 2rem;
    background: linear-gradient(180deg, #0d1428 0%, #0a0f1e 100%);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .lb-hero-title {
    font-size: 2.4rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, #f5c518 0%, #fff 60%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 0.4rem;
  }
  .lb-hero-sub {
    color: #7a8099;
    font-size: 0.88rem;
    margin: 0 0 0.5rem;
  }
  .lb-updated {
    font-size: 0.75rem;
    color: #4a5070;
    margin: 0;
  }
  .refresh-btn {
    background: none;
    border: none;
    color: #5a9cf5;
    cursor: pointer;
    font-size: 0.75rem;
    text-decoration: underline;
    padding: 0;
  }

  /* Content */
  .lb-content {
    max-width: 860px;
    margin: 2.5rem auto 0;
    padding: 0 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  /* Leaderboard section */
  .lb-section {
    background: #0e1525;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    overflow: hidden;
  }
  .lb-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 1.25rem 1.5rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .lb-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #f5c518;
    margin: 0 0 0.25rem;
  }
  .lb-desc {
    font-size: 0.78rem;
    color: #7a8099;
    margin: 0;
    line-height: 1.4;
  }
  .lb-scoring-key {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
  }
  .scoring-rule {
    font-size: 0.72rem;
    color: #5a6080;
    display: flex;
    gap: 5px;
    align-items: center;
  }
  .sr-pts {
    font-weight: 700;
    color: #f5c518;
    min-width: 20px;
    text-align: right;
  }

  /* Empty */
  .lb-empty {
    padding: 2.5rem 1.5rem;
    text-align: center;
    color: #4a5070;
    font-size: 0.85rem;
  }

  /* Table */
  .lb-table-wrap { overflow-x: auto; }
  .lb-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  .lth {
    padding: 0.5rem 1rem;
    color: #5a6080;
    font-weight: 600;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .lth-rank { width: 56px; text-align: center; }
  .lth-name { text-align: left; }
  .lth-num { width: 88px; text-align: center; }
  .lth-pts { width: 72px; text-align: center; color: #c8a800; }

  .lb-row {
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.12s;
  }
  .lb-row:hover { background: rgba(255,255,255,0.04); }
  .lb-row--top { background: rgba(245,197,24,0.04); }
  .lb-row--top:hover { background: rgba(245,197,24,0.07); }

  .ltd {
    padding: 0.65rem 1rem;
    text-align: center;
    color: #c8cce0;
  }
  .ltd-rank { text-align: center; }
  .ltd-name {
    text-align: left;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #dde0f0;
  }
  .ltd-num { color: #8a8ea8; }
  .ltd-pts {
    font-weight: 700;
    color: #f5c518;
    font-size: 0.95rem;
  }

  /* Avatar */
  .lb-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1e3a5f, #2a4d7a);
    font-size: 0.62rem;
    font-weight: 700;
    color: #a0c8ff;
    flex-shrink: 0;
  }

  /* Rank badge */
  .rank-badge {
    font-size: 1.1rem;
    display: inline-block;
  }
  .rank-num {
    font-size: 0.82rem;
    font-weight: 600;
    color: #5a6080;
  }

  /* Show more */
  .show-more-btn {
    display: block;
    width: 100%;
    padding: 0.75rem;
    background: none;
    border: none;
    border-top: 1px solid rgba(255,255,255,0.05);
    color: #5a9cf5;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.15s;
  }
  .show-more-btn:hover { background: rgba(90,156,245,0.06); }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    backdrop-filter: blur(4px);
  }
  .modal-card {
    background: #0e1525;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 1.75rem;
    max-width: 520px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
  }
  .modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255,255,255,0.08);
    border: none;
    color: #9aa0b8;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  .modal-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1e3a5f, #2a4d7a);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 700;
    color: #a0c8ff;
    flex-shrink: 0;
  }
  .modal-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: #f0f2ff;
    margin: 0 0 0.15rem;
  }
  .modal-type {
    font-size: 0.75rem;
    color: #5a6080;
    margin: 0;
  }

  /* Stats row */
  .modal-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-bottom: 1.25rem;
  }
  .stat-chip {
    background: #131929;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    padding: 0.6rem 0.9rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
    flex: 1;
  }
  .stat-chip--pts {
    border-color: rgba(245,197,24,0.25);
    background: rgba(245,197,24,0.05);
  }
  .stat-val {
    font-size: 1.3rem;
    font-weight: 800;
    color: #f0f2ff;
  }
  .stat-chip--pts .stat-val { color: #f5c518; }
  .stat-lbl {
    font-size: 0.65rem;
    color: #5a6080;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
    margin-top: 2px;
  }

  /* Prediction list in modal */
  .modal-preds-title {
    font-size: 0.75rem;
    color: #5a6080;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    font-weight: 600;
    margin: 0 0 0.6rem;
  }
  .preds-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .pred-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: #131929;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    flex-wrap: wrap;
    border-left: 3px solid transparent;
  }
  .pred-pts-3 { border-left-color: #4ade80; }
  .pred-pts-2 { border-left-color: #f5c518; }
  .pred-pts-1 { border-left-color: #f59e0b; }
  .pred-pts-0 { border-left-color: #374060; }

  .pred-teams {
    font-size: 0.78rem;
    color: #9aa0b8;
    flex: 1;
    min-width: 120px;
  }
  .pred-scores {
    font-size: 0.78rem;
    color: #9aa0b8;
  }
  .pred-scores strong { color: #dde0f0; }
  .pred-label { color: #5a6080; }
  .pred-pts {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .pts-3 { background: rgba(74,222,128,0.12); color: #4ade80; }
  .pts-2 { background: rgba(245,197,24,0.12); color: #f5c518; }
  .pts-1 { background: rgba(245,158,11,0.12); color: #f59e0b; }
  .pts-0 { background: rgba(55,64,96,0.4); color: #5a6080; }

  /* Loading / error */
  .loading-state, .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5rem 1rem;
    color: #5a6080;
    gap: 1rem;
    text-align: center;
  }
  .loading-spinner {
    width: 36px; height: 36px;
    border: 3px solid rgba(255,255,255,0.08);
    border-top-color: #f5c518;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .retry-btn {
    background: rgba(90,156,245,0.1);
    border: 1px solid rgba(90,156,245,0.3);
    color: #5a9cf5;
    padding: 0.4rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.82rem;
  }

  @media (max-width: 600px) {
    .lb-hero-title { font-size: 1.8rem; }
    .lb-content { padding: 0 0.75rem; }
    .lb-header { flex-direction: column; }
    .lb-scoring-key { align-items: flex-start; flex-direction: row; flex-wrap: wrap; gap: 6px; }
    .modal-card { padding: 1.25rem; }
    .modal-stats { gap: 0.4rem; }
    .stat-chip { min-width: 60px; padding: 0.5rem 0.6rem; }
    .stat-val { font-size: 1.1rem; }
  }
`;
