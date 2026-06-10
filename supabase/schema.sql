-- ============ WORLD CUP 2026 COMPANION · Supabase schema ============
-- Run this once in Supabase: SQL Editor → New query → paste → Run.

create table if not exists votes (
  id bigint generated always as identity primary key,
  match_id text not null,
  pick text not null check (pick in ('h','d','a')),
  created_at timestamptz default now()
);
create index if not exists votes_match_idx on votes(match_id);

create table if not exists score_predictions (
  id bigint generated always as identity primary key,
  match_id text not null,
  name text not null check (char_length(name) between 1 and 40),
  home smallint not null check (home between 0 and 20),
  away smallint not null check (away between 0 and 20),
  created_at timestamptz default now()
);
create index if not exists preds_match_idx on score_predictions(match_id);

create table if not exists ballots (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 40),
  picks jsonb not null,
  created_at timestamptz default now()
);

-- Open read/insert for anonymous visitors (no accounts by design).
alter table votes enable row level security;
alter table score_predictions enable row level security;
alter table ballots enable row level security;

create policy "anon read votes"   on votes for select using (true);
create policy "anon insert votes" on votes for insert with check (true);
create policy "anon read preds"   on score_predictions for select using (true);
create policy "anon insert preds" on score_predictions for insert with check (true);
create policy "anon read ballots" on ballots for select using (true);
create policy "anon insert ballots" on ballots for insert with check (true);
