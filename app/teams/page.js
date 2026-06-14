'use client';

import { useEffect, useState } from 'react';
import { GROUPS, DETAILS, TEAM } from '@/lib/teams';
import { computeGroupStandings } from '@/lib/standings';

function GDCell({ value }) {
  const display = value > 0 ? '+' + value : String(value);
  const color = value > 0 ? '#4ade80' : value < 0 ? '#f87171' : '#5a6080';
  return <td className="std-td" style={{ fontWeight: 600, color }}>{display}</td>;
}

function StandingsTable({ rows }) {
  const hasStarted = rows.some(r => r.played > 0);
  const isComplete = rows.every(r => r.played === 3);
  const pillLabel = !hasStarted ? 'Upcoming' : isComplete ? 'Complete' : 'In Progress';
  const pillBg = !hasStarted ? 'rgba(90,96,128,0.2)' : isComplete ? 'rgba(245,197,24,0.15)' : 'rgba(74,222,128,0.15)';
  const pillColor = !hasStarted ? '#5a6080' : isComplete ? '#f5c518' : '#4ade80';

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 10px', borderRadius: 20, background: pillBg, color: pillColor }}>
          {pillLabel}
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="std-table">
          <thead>
            <tr>
              <th className="std-th" style={{ textAlign: 'left', width: 36 }}>Pos</th>
              <th className="std-th" style={{ textAlign: 'left' }}>Team</th>
              <th className="std-th" title="Played">P</th>
              <th className="std-th" title="Won">W</th>
              <th className="std-th" title="Drawn">D</th>
              <th className="std-th" title="Lost">L</th>
              <th className="std-th" title="Goals For">GF</th>
              <th className="std-th" title="Goals Against">GA</th>
              <th className="std-th" title="Goal Difference">GD</th>
              <th className="std-th" style={{ color: '#c8a800' }} title="Points">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const pos = i + 1;
              const isAuto = pos <= 2;
              const isThird = pos === 3;
              const borderColor = isAuto ? '#4ade80' : isThird ? '#f59e0b' : 'transparent';
              const posColor = isAuto ? '#4ade80' : isThird ? '#f59e0b' : '#5a6080';
              const rowOpacity = !isAuto && !isThird && hasStarted ? 0.5 : 1;
              const team = TEAM[row.team];
              return (
                <tr key={row.team} className="std-row" style={{ borderLeft: '3px solid ' + borderColor, opacity: rowOpacity }}>
                  <td className="std-td" style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: posColor }}>{pos}</span>
                  </td>
                  <td className="std-td" style={{ textAlign: 'left', minWidth: 130 }}>
                    <span style={{ marginRight: 6 }}>{team?.flag || ''}</span>
                    <span style={{ fontWeight: 500, color: '#dde0f0' }}>{team?.name || row.team}</span>
                  </td>
                  <td className="std-td">{row.played}</td>
                  <td className="std-td">{row.won}</td>
                  <td className="std-td">{row.drawn}</td>
                  <td className="std-td">{row.lost}</td>
                  <td className="std-td">{row.gf}</td>
                  <td className="std-td">{row.ga}</td>
                  <GDCell value={row.gd} />
                  <td className="std-td" style={{ fontWeight: 700, color: '#f5c518' }}>{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
        {[['#4ade80', 'Advances'], ['#f59e0b', 'Best third contender']].map(([color, label]) => (
          <span key={label} style={{ fontSize: 11, color: '#5a6080', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScoutBlock({ label, text }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <p style={{ fontSize: 12, color: '#8a8ea8', lineHeight: 1.5, margin: 0 }}>{text}</p>
    </div>
  );
}

function TeamCard({ team }) {
  const [open, setOpen] = useState(false);
  const d = DETAILS[team.id] || {};
  return (
    <div style={{ border: '1px solid ' + (open ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.07)'), borderRadius: 8, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: '#131929', border: 'none', padding: '10px 14px', color: '#dde0f0', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 16 }}>{team.flag}</span>
        <span style={{ flex: 1 }}>{team.name}</span>
        <span style={{ fontSize: 10, color: '#5a6080' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '12px 14px 14px', background: '#0c1220' }}>
          {d.intro
            ? <p style={{ fontSize: 13, color: '#b0b4c8', lineHeight: 1.6, margin: '0 0 10px' }}>{d.intro}</p>
            : <p style={{ fontSize: 13, color: '#b0b4c8', lineHeight: 1.6, margin: '0 0 10px' }}>{team.summary}</p>
          }
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8, marginBottom: 8 }}>
            {d.style && <ScoutBlock label="Style" text={d.style} />}
            {d.strengths && <ScoutBlock label="Strengths" text={d.strengths} />}
            {d.weaknesses && <ScoutBlock label="Weaknesses" text={d.weaknesses} />}
            {d.outlook && <ScoutBlock label="Outlook" text={d.outlook} />}
          </div>
          {d.keyPlayers && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Key Players</span>
              <p style={{ fontSize: 12, color: '#8a8ea8', margin: '3px 0 0' }}>
                {Array.isArray(d.keyPlayers) ? d.keyPlayers.join(', ') : d.keyPlayers}
              </p>
            </div>
          )}
          {d.coach && (
            <div>
              <span style={{ fontSize: 10, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Coach</span>
              <p style={{ fontSize: 12, color: '#8a8ea8', margin: '3px 0 0' }}>{d.coach}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroupSection({ groupData, standingsRows }) {
  const [showScout, setShowScout] = useState(false);
  return (
    <section style={{ background: '#0e1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 14px', borderBottom: showScout ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f5c518', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Group {groupData.g}
        </h2>
        <StandingsTable rows={standingsRows} />
        <button
          onClick={() => setShowScout(s => !s)}
          style={{ marginTop: 12, fontSize: 12, color: '#5a9cf5', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
        >
          {showScout ? 'Hide scouting reports' : 'Show scouting reports'}
        </button>
      </div>
      {showScout && (
        <div style={{ padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {groupData.teams.map(team => <TeamCard key={team.id} team={team} />)}
        </div>
      )}
    </section>
  );
}

// Default zero-stats rows for a group
function defaultRows(groupData) {
  return groupData.teams.map(t => ({ team: t.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }));
}

export default function TeamsPage() {
  const [standingsByGroup, setStandingsByGroup] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch matches from our own API. The route returns { source, matches },
        // and the matches already carry persisted FT scores from Supabase, so
        // we compute standings directly from them - no separate results query.
        const res = await fetch('/api/matches');
        const data = res.ok ? await res.json() : {};
        const matches = Array.isArray(data.matches) ? data.matches : [];
        // Only group-stage matches with both teams resolved
        const groupMatches = matches.filter(m => m.group && m.h && m.a);
        const computed = computeGroupStandings(groupMatches, []);
        setStandingsByGroup(computed);
      } catch (e) {
        console.error('Standings load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <style>{`
        .std-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .std-th { padding: 5px 5px; color: #5a6080; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .std-td { padding: 7px 5px; text-align: center; color: #c8cce0; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .std-row:last-child .std-td { border-bottom: none; }
        .std-row:hover { background: rgba(255,255,255,0.03); }
        .spin { animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 500px) {
          .std-table { font-size: 11.5px; }
          .std-th, .std-td { padding: 5px 3px; }
        }
      `}</style>
      <main style={{ minHeight: '100vh', background: '#0a0f1e', color: '#e8eaf0', fontFamily: 'Inter,system-ui,sans-serif', paddingBottom: '4rem' }}>
        <header style={{ textAlign: 'center', padding: '3rem 1.5rem 2rem', background: 'linear-gradient(180deg,#0d1428 0%,#0a0f1e 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h1 style={{ fontSize: 'clamp(1.8rem,5vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', background: 'linear-gradient(135deg,#f5c518 0%,#fff 60%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 6px' }}>
            Group Stage
          </h1>
          <p style={{ color: '#7a8099', fontSize: 14, margin: '0 0 4px' }}>48 teams · 12 groups · top 2 advance + 8 best third-place teams</p>
        </header>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5rem 1rem', color: '#5a6080', gap: 12 }}>
            <div className="spin" style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#f5c518', borderRadius: '50%' }} />
            <p style={{ margin: 0, fontSize: 14 }}>Loading standings...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,560px),1fr))', gap: '1.5rem', maxWidth: 1280, margin: '2rem auto 0', padding: '0 1.5rem' }}>
            {GROUPS.map(groupData => (
              <GroupSection
                key={groupData.g}
                groupData={groupData}
                standingsRows={standingsByGroup[groupData.g] || defaultRows(groupData)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
