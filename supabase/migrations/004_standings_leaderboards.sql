-- ============================================================
-- MIGRATION: Group Standings + Leaderboards
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Ensure the `results` table has a `group` column
--    (skip if it already exists)
ALTER TABLE results
  ADD COLUMN IF NOT EXISTS "group" TEXT;

-- 2. Ensure the `results` table has a `status` column
--    that stores 'FT', 'AET', or 'PEN' for finished matches
--    (skip if it already exists)
ALTER TABLE results
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'FT';

-- ============================================================
-- score_predictions table
-- Stores user exact score guesses (one per user per match)
-- ============================================================
CREATE TABLE IF NOT EXISTS score_predictions (
  id          BIGSERIAL PRIMARY KEY,
  match_id    INTEGER     NOT NULL,
  user_name   TEXT        NOT NULL,
  home_score  INTEGER     NOT NULL,
  away_score  INTEGER     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_name)
);

-- RLS: anyone can read, anyone can insert (same pattern as votes)
ALTER TABLE score_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_score_predictions" ON score_predictions;
CREATE POLICY "allow_read_score_predictions"
  ON score_predictions FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "allow_insert_score_predictions" ON score_predictions;
CREATE POLICY "allow_insert_score_predictions"
  ON score_predictions FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- GRANT permissions (if you hit "permission denied" errors)
-- ============================================================
GRANT SELECT, INSERT ON score_predictions TO anon;
GRANT SELECT ON results TO anon;
GRANT SELECT ON votes TO anon;

-- ============================================================
-- OPTIONAL: Materialized view for fast leaderboard queries
-- Refresh it in your /api/results route after saving FT scores
-- ============================================================

-- Outcome leaderboard view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_outcome_leaderboard AS
  SELECT
    v.user_name AS name,
    COUNT(*) FILTER (WHERE r.status IN ('FT','AET','PEN')) AS total,
    COUNT(*) FILTER (
      WHERE r.status IN ('FT','AET','PEN')
        AND v.vote = CASE
          WHEN r.home_score > r.away_score THEN 'home'
          WHEN r.home_score = r.away_score THEN 'draw'
          ELSE 'away'
        END
    ) AS correct,
    COUNT(*) FILTER (
      WHERE r.status IN ('FT','AET','PEN')
        AND v.vote = CASE
          WHEN r.home_score > r.away_score THEN 'home'
          WHEN r.home_score = r.away_score THEN 'draw'
          ELSE 'away'
        END
    ) AS points
  FROM votes v
  LEFT JOIN results r USING (match_id)
  GROUP BY v.user_name
  ORDER BY points DESC, correct DESC;

-- Score leaderboard view (exact scoring done client-side for now;
-- the view below just aggregates raw predictions for quick access)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_score_predictions_with_results AS
  SELECT
    sp.user_name,
    sp.match_id,
    sp.home_score AS pred_home,
    sp.away_score AS pred_away,
    r.home_score  AS act_home,
    r.away_score  AS act_away,
    r.home_team,
    r.away_team,
    r.status
  FROM score_predictions sp
  LEFT JOIN results r USING (match_id)
  WHERE r.status IN ('FT','AET','PEN');

-- To refresh both views after a match result is saved:
-- REFRESH MATERIALIZED VIEW mv_outcome_leaderboard;
-- REFRESH MATERIALIZED VIEW mv_score_predictions_with_results;
-- 
-- Add this to your existing /api/save-result or /api/override route:
--   await supabase.rpc('refresh_leaderboard_views')
--
-- And create the RPC function:
CREATE OR REPLACE FUNCTION refresh_leaderboard_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_outcome_leaderboard;
  REFRESH MATERIALIZED VIEW mv_score_predictions_with_results;
END;
$$;

-- Grant execute to service_role (called from your API routes)
GRANT EXECUTE ON FUNCTION refresh_leaderboard_views() TO service_role;

-- ============================================================
-- INDEX helpers for leaderboard query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_votes_match_id     ON votes (match_id);
CREATE INDEX IF NOT EXISTS idx_votes_user         ON votes (user_name);
CREATE INDEX IF NOT EXISTS idx_sp_match_id        ON score_predictions (match_id);
CREATE INDEX IF NOT EXISTS idx_sp_user            ON score_predictions (user_name);
CREATE INDEX IF NOT EXISTS idx_results_status     ON results (status);
CREATE INDEX IF NOT EXISTS idx_results_group      ON results ("group");
