-- TEA-30: Cache search results for 24 hours
--
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New
-- query) for each environment (subprod + prod). There's no migration
-- runner wired up in this project yet, so this file is applied by hand,
-- same as the reviews/reactions tables from TEA-16.

create table if not exists api_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  query text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint api_cache_provider_query_key unique (provider, query)
);

-- Every lookup and upsert filters on (provider, query); the unique
-- constraint above already gives us an index for that pair. This second
-- index speeds up periodically sweeping/deleting expired rows.
create index if not exists api_cache_expires_at_idx on api_cache (expires_at);

-- The app talks to Supabase with the anon/publishable key (see
-- lib/supabase.ts), so RLS must explicitly allow it to read and write this
-- table. There's no per-user data here - it's a shared, provider-keyed
-- cache - so these policies are intentionally open to any request using
-- the anon key, same trust level as the rest of this project's tables.
alter table api_cache enable row level security;

create policy "Allow read access to api_cache"
  on api_cache for select
  using (true);

create policy "Allow insert access to api_cache"
  on api_cache for insert
  with check (true);

create policy "Allow update access to api_cache"
  on api_cache for update
  using (true)
  with check (true);

-- Optional: periodically clear expired rows so the table doesn't grow
-- unbounded. Safe to run manually or on a schedule (e.g. Supabase's pg_cron
-- if enabled); not required for TEA-30's acceptance criteria.
-- delete from api_cache where expires_at < now();