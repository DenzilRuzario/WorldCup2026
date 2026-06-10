# 🏆 World Cup 2026 Companion

Live matches, team guides and fan predictions for the FIFA World Cup 2026.
Next.js + Supabase (shared predictions) + football-data.org (live scores).

## Setup — 3 steps, ~10 minutes

### 1 · Supabase (predictions database)
1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the contents of `supabase/schema.sql` → **Run**.
3. Go to **Project Settings → API** and copy the **Project URL** and **anon public** key.

### 2 · Environment variables
Copy `.env.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
FOOTBALL_DATA_API_KEY=...        # your football-data.org token
```
The football-data key stays server-side (used only in `app/api/matches`).

### 3 · Run / deploy
Local:
```
npm install
npm run dev          # http://localhost:3000
```
Deploy (Vercel, free):
1. Push this folder to a GitHub repo (or run `npx vercel` in it).
2. In Vercel: **Add New Project** → import the repo.
3. Add the three environment variables in **Settings → Environment Variables**.
4. Deploy → your site is live at `https://<project>.vercel.app`.

## How it works
- `app/api/matches` proxies football-data.org (`competitions/WC/matches`), caches
  responses for 60s (well inside the free 10 req/min limit), and maps API teams
  to the local 48-team dataset by TLA code. If the key is missing or the request
  fails, the site falls back to the sample fixtures in `lib/fallback.js`.
- Votes / score predictions / ballots are inserted into Supabase as rows
  (no accounts; one-vote-per-match is enforced per browser via localStorage).
- Recaps grade predictions against real final scores automatically.

## Editing content
- Team facts, summaries and squads: `lib/teams.js` (the `T` array and `DETAILS`).
- Add full analysis for more teams by adding entries to `DETAILS` — the team
  page upgrades automatically.

## Notes
- FIFA ranks, titles/appearances and squads are editable sample data.
- football-data.org free tier may have slight delays on live scores.
