// lib/standings.js
// Computes group standings from the `results` table in Supabase.
// No external API calls — pure calculation from stored FT scores.

/**
 * Given an array of result rows from the `results` table, returns a map of
 * groupId → sorted standings array.
 *
 * Expected result row shape:
 * {
 *   match_id: number,
 *   home_team: string,   // team name, must match teams.js keys
 *   away_team: string,
 *   home_score: number,
 *   away_score: number,
 *   group: string,       // e.g. "A", "B", ...
 *   status: string,      // "FT" | "AET" | "PEN" — only these count
 * }
 */
export function computeGroupStandings(results, teamsByGroup) {
  // Build a blank record for each team in each group
  const standings = {}; // { "A": { "Germany": {...}, ... }, ... }

  for (const [group, teams] of Object.entries(teamsByGroup)) {
    standings[group] = {};
    for (const team of teams) {
      standings[group][team] = {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
      };
    }
  }

  const FINISHED = new Set(['FT', 'AET', 'PEN', 'ft', 'aet', 'pen']);

  for (const r of results) {
    if (!FINISHED.has(r.status)) continue;
    const group = r.group;
    if (!standings[group]) continue;

    const hs = Number(r.home_score);
    const as_ = Number(r.away_score);
    if (isNaN(hs) || isNaN(as_)) continue;

    const home = standings[group][r.home_team];
    const away = standings[group][r.away_team];
    if (!home || !away) continue;

    // Both teams: played +1, goals
    home.played++;
    away.played++;
    home.gf += hs;
    home.ga += as_;
    away.gf += as_;
    away.ga += hs;

    if (hs > as_) {
      home.won++;
      away.lost++;
      home.points += 3;
    } else if (hs === as_) {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    } else {
      away.won++;
      home.lost++;
      away.points += 3;
    }
  }

  // Compute GD and sort each group
  const sorted = {};
  for (const [group, teamMap] of Object.entries(standings)) {
    const arr = Object.values(teamMap).map((t) => ({
      ...t,
      gd: t.gf - t.ga,
    }));

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

/**
 * Leaderboard scoring helpers
 */

// Match winner leaderboard: +1 for correct outcome (W/D/L)
export function scoreMatchOutcome(predicted, actual) {
  // predicted/actual: 'home' | 'draw' | 'away'
  return predicted === actual ? 1 : 0;
}

// Exact score leaderboard: 3/2/1/0 based on closeness
export function scoreExactPrediction(predHome, predAway, actualHome, actualAway) {
  const ph = Number(predHome);
  const pa = Number(predAway);
  const ah = Number(actualHome);
  const aa = Number(actualAway);

  if (isNaN(ph) || isNaN(pa) || isNaN(ah) || isNaN(aa)) return 0;

  // Total goal difference across both scores
  const diff = Math.abs(ph - ah) + Math.abs(pa - aa);

  if (diff === 0) return 3;
  if (diff === 1) return 2;
  if (diff === 2) return 1;
  return 0;
}

// Determine actual match outcome from scores
export function getOutcome(homeScore, awayScore) {
  if (homeScore > awayScore) return 'home';
  if (homeScore === awayScore) return 'draw';
  return 'away';
}
