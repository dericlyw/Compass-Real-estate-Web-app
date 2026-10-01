-- Test/pilot storage: the whole workspace as one JSONB document per workspace id.
-- Used by lib/data/store.ts when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
-- Writes are guarded by `rev` (optimistic concurrency). The relational schema in
-- 0001_init.sql remains the production target.

create table if not exists public.workspace_store (
  id         text primary key,
  data       jsonb not null,
  rev        integer not null default 1,
  updated_at timestamptz not null default now()
);

-- Server-side access only (service role bypasses RLS). No policies = no anon/auth access.
alter table public.workspace_store enable row level security;
revoke all on public.workspace_store from anon, authenticated;
