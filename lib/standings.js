// lib/standings.js
// Computes group standings from the `results` table + match list.
// No external API calls - pure calculation from stored data.
//
// results rows:  { match_id, home, away }   (from Supabase results table)
// matches list:  { id, h, a, group, status, hs, as }  (from /api/matches)
//
// Usage:
//   const standings = computeGroupStandings(matches, results);
//   // returns { "A": [{team, played, won, drawn, lost, gf, ga, gd, points}, ...], ... }

export function computeGroupStandings(matches, results) {
  // Build a map of match_id -> result score from the results table
  const resultMap = {};
  for (const r of results || []) {
    resultMap[String(r.match_id)] = { home: r.home, away: r.away };
  }

  // Build blank record per team per group
  const standings = {}; // { "A": { "ger": {...}, ... }, ... }

  for (const m of matches || []) {
    if (!m.group || !m.h || !m.a) continue;
    const g = m.group;
    if (!standings[g]) standings[g] = {};
    if (!standings[g][m.h]) standings[g][m.h] = blank(m.h);
    if (!standings[g][m.a]) standings[g][m.a] = blank(m.a);
  }

  // Tally results
  const now = Date.now();
  for (const m of matches || []) {
    if (!m.group || !m.h || !m.a) continue;

    // A match counts toward standings when it has a final score. Detect "finished"
    // robustly: an explicit ft/FINISHED status, OR a stored result, OR both scores
    // present with kickoff + full match duration already elapsed (covers sample
    // fixtures whose status is computed client-side rather than stored on the row).
    const stored = resultMap[String(m.id)];
    const ko = m.ko ? new Date(m.ko).getTime() : null;
    const timeFinished = ko !== null && now > ko + 115 * 60000;
    const statusFinished = m.status === 'ft' || m.status === 'FT' || m.status === 'FINISHED';
    const hasScore = m.hs !== null && m.hs !== undefined && m.as !== null && m.as !== undefined;

    let hs, as_;
    if (stored) {
      hs = Number(stored.home);
      as_ = Number(stored.away);
    } else if (hasScore && (statusFinished || timeFinished)) {
      hs = Number(m.hs);
      as_ = Number(m.as);
    } else {
      continue; // not finished
    }

    if (isNaN(hs) || isNaN(as_)) continue;

    const g = m.group;
    if (!standings[g]?.[m.h] || !standings[g]?.[m.a]) continue;

    const home = standings[g][m.h];
    const away = standings[g][m.a];

    home.played++; away.played++;
    home.gf += hs; home.ga += as_;
    away.gf += as_; away.ga += hs;

    if (hs > as_) {
      home.won++; away.lost++;
      home.points += 3;
    } else if (hs === as_) {
      home.drawn++; away.drawn++;
      home.points += 1; away.points += 1;
    } else {
      away.won++; home.lost++;
      away.points += 3;
    }
  }

  // Sort each group
  const sorted = {};
  for (const [group, teamMap] of Object.entries(standings)) {
    const arr = Object.values(teamMap).map(t => ({ ...t, gd: t.gf - t.ga }));
    arr.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team);
    });
    sorted[group] = arr;
  }

  return sorted;
}

function blank(teamId) {
  return { team: teamId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
}

// Leaderboard helpers

// Determine match outcome from scores
export function getOutcome(homeScore, awayScore) {
  if (homeScore > awayScore) return 'h';
  if (homeScore === awayScore) return 'd';
  return 'a';
}

// Exact score leaderboard: 3/2/1/0
// Uses `home`/`away` column names from score_predictions table
export function scoreExactPrediction(predHome, predAway, actualHome, actualAway) {
  const ph = Number(predHome), pa = Number(predAway);
  const ah = Number(actualHome), aa = Number(actualAway);
  if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) return 0;
  const diff = Math.abs(ph - ah) + Math.abs(pa - aa);
  if (diff === 0) return 3;
  if (diff === 1) return 2;
  if (diff === 2) return 1;
  return 0;
}
