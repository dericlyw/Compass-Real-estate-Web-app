-- Pilot-test storage: one jsonb document per workspace, written only by the server
-- (service role). RLS is on with no policies, so anon/authenticated keys cannot read it.
create table if not exists app_state (
  id text primary key,
  rev integer not null default 1,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_state enable row level security;
