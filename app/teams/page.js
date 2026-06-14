'use client';

// app/teams/page.js
// Teams page with Group Standings Tables.
// Standings computed from the `results` table — no extra API calls.

import { createClient } from '@/lib/supabase/client';
import { TEAMS, GROUP_OVERVIEWS } from '@/lib/teams';
import { computeGroupStandings } from '@/lib/standings';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// ─── helpers ────────────────────────────────────────────────────────────────

function getQualificationStatus(pos, totalTeams) {
  // 2026 format: top 2 auto-qualify, 3rd place enters best-third playoff
  if (pos === 1 || pos === 2) return 'auto';
  if (pos === 3) return 'third';
  return 'eliminated';
}

function QualBadge({ pos }) {
  const status = getQualificationStatus(pos, 4);
  if (status === 'auto') {
    return (
      <span className="qual-badge qual-auto" title="Advances to Round of 32">
        ✓
      </span>
    );
  }
  if (status === 'third') {
    return (
      <span className="qual-badge qual-third" title="Best third-place contender">
        ?
      </span>
    );
  }
  return null;
}

function GDCell({ value }) {
  const display = value > 0 ? `+${value}` : `${value}`;
  const cls = value > 0 ? 'gd-pos' : value < 0 ? 'gd-neg' : 'gd-zero';
  return <td className={`standings-td gd-cell ${cls}`}>{display}</td>;
}

function StandingsTable({ group, rows, matchesPlayed }) {
  const totalMatchdays = 3; // group stage: each team plays 3
  const isComplete = rows.every((r) => r.played === totalMatchdays);
  const hasStarted = rows.some((r) => r.played > 0);

  return (
    <div className="standings-wrapper">
      <div className="standings-status">
        {!hasStarted && <span className="status-pill pill-upcoming">Upcoming</span>}
        {hasStarted && !isComplete && <span className="status-pill pill-live">In Progress</span>}
        {isComplete && <span className="status-pill pill-done">Group Complete</span>}
      </div>

      <div className="table-scroll">
        <table className="standings-table">
          <thead>
            <tr>
              <th className="th-pos">Pos</th>
              <th className="th-team">Team</th>
              <th className="th-num" title="Played">P</th>
              <th className="th-num" title="Won">W</th>
              <th className="th-num" title="Drawn">D</th>
              <th className="th-num" title="Lost">L</th>
              <th className="th-num" title="Goals For">GF</th>
              <th className="th-num" title="Goals Against">GA</th>
              <th className="th-num" title="Goal Difference">GD</th>
              <th className="th-num th-pts" title="Points">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const pos = i + 1;
              const status = getQualificationStatus(pos, rows.length);
              return (
                <tr
                  key={row.team}
                  className={`standings-row row-${status}`}
                >
                  <td className="standings-td td-pos">
                    <span className={`pos-num pos-${status}`}>{pos}</span>
                    <QualBadge pos={pos} />
                  </td>
                  <td className="standings-td td-team">
                    <span className="team-flag">{getFlagEmoji(row.team)}</span>
                    <span className="team-name">{row.team}</span>
                  </td>
                  <td className="standings-td">{row.played}</td>
                  <td className="standings-td">{row.won}</td>
                  <td className="standings-td">{row.drawn}</td>
                  <td className="standings-td">{row.lost}</td>
                  <td className="standings-td">{row.gf}</td>
                  <td className="standings-td">{row.ga}</td>
                  <GDCell value={row.gd} />
                  <td className="standings-td td-pts">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="standings-legend">
        <span className="legend-item">
          <span className="legend-dot dot-auto" /> Advances
        </span>
        <span className="legend-item">
          <span className="legend-dot dot-third" /> Best third contender
        </span>
      </div>
    </div>
  );
}

// Simple flag emoji lookup by country name
function getFlagEmoji(teamName) {
  const flags = {
    'United States': '🇺🇸', 'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Canada': '🇨🇦',
    'Germany': '🇩🇪', 'France': '🇫🇷', 'Spain': '🇪🇸', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Argentina': '🇦🇷', 'Brazil': '🇧🇷', 'Portugal': '🇵🇹', 'Netherlands': '🇳🇱',
    'Belgium': '🇧🇪', 'Italy': '🇮🇹', 'Croatia': '🇭🇷', 'Denmark': '🇩🇰',
    'Uruguay': '🇺🇾', 'Colombia': '🇨🇴', 'Ecuador': '🇪🇨', 'Chile': '🇨🇱',
    'Peru': '🇵🇪', 'Venezuela': '🇻🇪', 'Bolivia': '🇧🇴', 'Paraguay': '🇵🇾',
    'Morocco': '🇲🇦', 'Senegal': '🇸🇳', 'Nigeria': '🇳🇬', 'Ghana': '🇬🇭',
    'Cameroon': '🇨🇲', 'Egypt': '🇪🇬', 'South Africa': '🇿🇦', 'Mali': '🇲🇱',
    'Tunisia': '🇹🇳', 'Algeria': '🇩🇿', 'Ivory Coast': '🇨🇮', 'DR Congo': '🇨🇩',
    'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Australia': '🇦🇺', 'Iran': '🇮🇷',
    'Saudi Arabia': '🇸🇦', 'Qatar': '🇶🇦', 'Indonesia': '🇮🇩', 'Uzbekistan': '🇺🇿',
    'New Zealand': '🇳🇿', 'Switzerland': '🇨🇭', 'Austria': '🇦🇹', 'Poland': '🇵🇱',
    'Türkiye': '🇹🇷', 'Turkey': '🇹🇷', 'Ukraine': '🇺🇦', 'Czechia': '🇨🇿',
    'Slovakia': '🇸🇰', 'Hungary': '🇭🇺', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Serbia': '🇷🇸',
    'Romania': '🇷🇴', 'Albania': '🇦🇱', 'Georgia': '🇬🇪', 'Panama': '🇵🇦',
    'Costa Rica': '🇨🇷', 'Honduras': '🇭🇳', 'Jamaica': '🇯🇲',
  };
  return flags[teamName] || '🏳️';
}

// ─── Team Card (scouting info, collapsible) ──────────────────────────────────

function TeamCard({ team, data }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`team-card ${open ? 'team-card--open' : ''}`}>
      <button
        className="team-card__header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="team-card__flag">{getFlagEmoji(team)}</span>
        <span className="team-card__name">{team}</span>
        <span className="team-card__chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="team-card__body">
          {data.intro && <p className="scout-intro">{data.intro}</p>}
          <div className="scout-grid">
            {data.style && (
              <div className="scout-block">
                <h4 className="scout-label">Style</h4>
                <p>{data.style}</p>
              </div>
            )}
            {data.strengths && (
              <div className="scout-block">
                <h4 className="scout-label">Strengths</h4>
                <p>{data.strengths}</p>
              </div>
            )}
            {data.weaknesses && (
              <div className="scout-block">
                <h4 className="scout-label">Weaknesses</h4>
                <p>{data.weaknesses}</p>
              </div>
            )}
            {data.outlook && (
              <div className="scout-block">
                <h4 className="scout-label">Outlook</h4>
                <p>{data.outlook}</p>
              </div>
            )}
          </div>
          {data.keyPlayers && (
            <div className="scout-block">
              <h4 className="scout-label">Key Players</h4>
              <p>{data.keyPlayers}</p>
            </div>
          )}
          {data.coach && (
            <div className="scout-block">
              <h4 className="scout-label">Coach</h4>
              <p>{data.coach}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Group Section ────────────────────────────────────────────────────────────

function GroupSection({ groupId, teams, overview, standingsRows }) {
  const [showScout, setShowScout] = useState(false);

  return (
    <section className="group-section">
      <div className="group-header">
        <h2 className="group-title">Group {groupId}</h2>
        {overview && <p className="group-overview">{overview}</p>}
        <button
          className="scout-toggle"
          onClick={() => setShowScout((s) => !s)}
        >
          {showScout ? 'Hide Team Scouting' : 'Show Team Scouting ▼'}
        </button>
      </div>

      <StandingsTable group={groupId} rows={standingsRows} />

      {showScout && (
        <div className="scout-section">
          <h3 className="scout-section-title">Team Scouting</h3>
          <div className="team-cards-grid">
            {teams.map((team) => (
              <TeamCard key={team} team={team} data={TEAMS[team] || {}} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const [standingsByGroup, setStandingsByGroup] = useState({});
  const [loading, setLoading] = useState(true);

  // Build group → team list from TEAMS data
  const teamsByGroup = {};
  for (const [teamName, data] of Object.entries(TEAMS)) {
    const g = data.group;
    if (!g) continue;
    if (!teamsByGroup[g]) teamsByGroup[g] = [];
    teamsByGroup[g].push(teamName);
  }
  const groups = Object.keys(teamsByGroup).sort();

  useEffect(() => {
    async function fetchResults() {
      try {
        const supabase = createClient();
        const { data: results, error } = await supabase
          .from('results')
          .select('match_id, home_team, away_team, home_score, away_score, group, status')
          .in('status', ['FT', 'AET', 'PEN', 'ft', 'aet', 'pen']);

        if (error) throw error;

        const computed = computeGroupStandings(results || [], teamsByGroup);
        setStandingsByGroup(computed);
      } catch (err) {
        console.error('Failed to load standings:', err);
        // Fall back to zero-stats standings so table still renders
        const fallback = {};
        for (const [group, teams] of Object.entries(teamsByGroup)) {
          fallback[group] = teams.map((team) => ({
            team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
          }));
        }
        setStandingsByGroup(fallback);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{STYLES}</style>
      <main className="teams-page">
        <header className="teams-hero">
          <h1 className="teams-hero-title">Group Stage</h1>
          <p className="teams-hero-sub">
            48 teams · 12 groups · top 2 advance + 8 best third-place teams
          </p>
          <Link href="/leaderboards" className="hero-leaderboard-link">
            🏆 View Prediction Leaderboards →
          </Link>
        </header>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading standings…</p>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map((groupId) => (
              <GroupSection
                key={groupId}
                groupId={groupId}
                teams={teamsByGroup[groupId]}
                overview={GROUP_OVERVIEWS?.[groupId]}
                standingsRows={
                  standingsByGroup[groupId] ||
                  (teamsByGroup[groupId] || []).map((team) => ({
                    team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
                  }))
                }
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  .teams-page {
    min-height: 100vh;
    background: #0a0f1e;
    color: #e8eaf0;
    font-family: 'Inter', system-ui, sans-serif;
    padding-bottom: 4rem;
  }

  /* Hero */
  .teams-hero {
    text-align: center;
    padding: 3rem 1.5rem 2rem;
    background: linear-gradient(180deg, #0d1428 0%, #0a0f1e 100%);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .teams-hero-title {
    font-size: 2.4rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, #f5c518 0%, #ffffff 60%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 0.4rem;
  }
  .teams-hero-sub {
    color: #7a8099;
    font-size: 0.9rem;
    margin: 0 0 1.2rem;
  }
  .hero-leaderboard-link {
    display: inline-block;
    font-size: 0.82rem;
    color: #f5c518;
    text-decoration: none;
    border: 1px solid rgba(245,197,24,0.3);
    padding: 0.35rem 0.9rem;
    border-radius: 20px;
    transition: background 0.2s;
  }
  .hero-leaderboard-link:hover {
    background: rgba(245,197,24,0.1);
  }

  /* Groups grid — 2 columns on wide screens */
  .groups-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 600px), 1fr));
    gap: 2rem;
    max-width: 1300px;
    margin: 2.5rem auto 0;
    padding: 0 1.5rem;
  }

  /* Group section */
  .group-section {
    background: #0e1525;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    overflow: hidden;
  }
  .group-header {
    padding: 1.25rem 1.25rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .group-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #f5c518;
    margin: 0 0 0.3rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .group-overview {
    font-size: 0.8rem;
    color: #7a8099;
    margin: 0 0 0.75rem;
    line-height: 1.5;
  }
  .scout-toggle {
    font-size: 0.76rem;
    color: #5a9cf5;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* Status pills */
  .standings-wrapper {
    padding: 0.75rem 1.25rem 1rem;
  }
  .standings-status {
    margin-bottom: 0.6rem;
  }
  .status-pill {
    font-size: 0.68rem;
    font-weight: 600;
    padding: 0.2rem 0.55rem;
    border-radius: 20px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .pill-upcoming { background: rgba(122,128,153,0.15); color: #7a8099; }
  .pill-live { background: rgba(74,222,128,0.15); color: #4ade80; }
  .pill-done { background: rgba(245,197,24,0.12); color: #f5c518; }

  /* Table */
  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .standings-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }
  .standings-table thead tr {
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .standings-table th {
    padding: 0.4rem 0.5rem;
    color: #5a6080;
    font-weight: 600;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .th-pos { text-align: left; width: 48px; }
  .th-team { text-align: left; }
  .th-num { text-align: center; width: 32px; }
  .th-pts { color: #c8a800 !important; }

  .standings-td {
    padding: 0.5rem 0.5rem;
    text-align: center;
    color: #c8cce0;
  }
  .td-pos {
    text-align: left;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .td-team {
    text-align: left;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 140px;
  }
  .td-pts {
    font-weight: 700;
    color: #f5c518 !important;
  }

  /* Row qualification highlighting */
  .standings-row { transition: background 0.15s; }
  .standings-row:hover { background: rgba(255,255,255,0.03); }

  .row-auto {
    border-left: 3px solid #4ade80;
  }
  .row-third {
    border-left: 3px solid #f59e0b;
  }
  .row-eliminated {
    border-left: 3px solid transparent;
  }
  .row-eliminated .team-name,
  .row-eliminated .standings-td {
    opacity: 0.55;
  }

  /* Position number */
  .pos-num {
    font-size: 0.78rem;
    font-weight: 600;
    width: 18px;
    display: inline-block;
    text-align: center;
  }
  .pos-auto { color: #4ade80; }
  .pos-third { color: #f59e0b; }
  .pos-eliminated { color: #5a6080; }

  /* Qual badges */
  .qual-badge {
    font-size: 0.6rem;
    border-radius: 3px;
    padding: 0 3px;
    font-weight: 700;
  }
  .qual-auto { color: #4ade80; }
  .qual-third { color: #f59e0b; }

  /* Team name */
  .team-flag { font-size: 1rem; }
  .team-name { font-weight: 500; color: #dde0f0; }

  /* Goal difference */
  .gd-cell { font-weight: 600; }
  .gd-pos { color: #4ade80; }
  .gd-neg { color: #f87171; }
  .gd-zero { color: #7a8099; }

  /* Legend */
  .standings-legend {
    display: flex;
    gap: 1rem;
    margin-top: 0.75rem;
    font-size: 0.72rem;
    color: #5a6080;
  }
  .legend-item { display: flex; align-items: center; gap: 5px; }
  .legend-dot {
    width: 8px; height: 8px; border-radius: 50%; display: inline-block;
  }
  .dot-auto { background: #4ade80; }
  .dot-third { background: #f59e0b; }

  /* Scout section */
  .scout-section { padding: 1rem 1.25rem 1.25rem; }
  .scout-section-title {
    font-size: 0.75rem;
    color: #5a6080;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    margin: 0 0 0.75rem;
  }
  .team-cards-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .team-card {
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    overflow: hidden;
  }
  .team-card--open { border-color: rgba(245,197,24,0.2); }
  .team-card__header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    background: #131929;
    border: none;
    padding: 0.65rem 0.9rem;
    color: #dde0f0;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
  }
  .team-card__header:hover { background: #1a2235; }
  .team-card__flag { font-size: 1.1rem; }
  .team-card__name { flex: 1; }
  .team-card__chevron { color: #5a6080; font-size: 0.7rem; }
  .team-card__body {
    padding: 0.75rem 0.9rem 0.9rem;
    background: #0c1220;
  }
  .scout-intro {
    font-size: 0.82rem;
    color: #b0b4c8;
    line-height: 1.6;
    margin: 0 0 0.75rem;
  }
  .scout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.6rem;
    margin-bottom: 0.6rem;
  }
  .scout-block { margin: 0; }
  .scout-label {
    font-size: 0.68rem;
    color: #f5c518;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    font-weight: 700;
    margin: 0 0 0.2rem;
  }
  .scout-block p {
    font-size: 0.8rem;
    color: #8a8ea8;
    line-height: 1.5;
    margin: 0;
  }

  /* Loading */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5rem 1rem;
    color: #5a6080;
    gap: 1rem;
  }
  .loading-spinner {
    width: 36px; height: 36px;
    border: 3px solid rgba(255,255,255,0.08);
    border-top-color: #f5c518;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 600px) {
    .teams-hero-title { font-size: 1.8rem; }
    .groups-grid { gap: 1.25rem; padding: 0 0.75rem; }
    .th-num { width: 24px; }
    .standings-table { font-size: 0.76rem; }
    .td-team { min-width: 110px; }
  }
`;
