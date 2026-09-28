-- PropVid Campaign Engine — initial schema.
-- Tenancy: agency → client (developer) → project. Row-level security on every table.
-- Every AI output stores model, prompt version, input hash and source references.

create extension if not exists pgcrypto;

-- ── Tenancy ────────────────────────────────────────────────────────
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  name text not null,
  brand_guide jsonb not null default '{}',
  data_retention_days int not null default 730, -- PDPA: configurable per client
  created_at timestamptz not null default now()
);

create type member_role as enum ('agency_admin', 'agency_operator', 'client_admin', 'client_viewer', 'negotiator');

create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agency_id uuid not null references agencies(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade, -- null = agency-wide
  role member_role not null
);
create unique index memberships_unique on memberships (user_id, agency_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  slug text not null unique,
  name text not null,
  city text,
  developer_licence text,
  advertising_permit text,
  permit_validity text,
  approving_authority text,
  whatsapp_number text,
  privacy_url text,
  created_at timestamptz not null default now()
);

-- Access helper: can the current user see this project?
create or replace function can_access_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from projects pr
    join clients c on c.id = pr.client_id
    join memberships m on m.agency_id = c.agency_id and (m.client_id is null or m.client_id = c.id)
    where pr.id = p and m.user_id = auth.uid()
  );
$$;

create or replace function can_approve_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from projects pr
    join clients c on c.id = pr.client_id
    join memberships m on m.agency_id = c.agency_id and (m.client_id is null or m.client_id = c.id)
    where pr.id = p and m.user_id = auth.uid() and m.role in ('agency_admin', 'agency_operator', 'client_admin')
  );
$$;

-- ── Ingest & study ─────────────────────────────────────────────────
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in ('video', 'brochure', 'price_list', 'floor_plan', 'permit', 'brand_guide', 'other')),
  storage_path text not null,
  proxy_path text,
  sha256 text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table video_maps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  media_asset_id uuid references media_assets(id) on delete set null,
  scenes jsonb not null, -- [{id,start,end,line,tags,isRender,hook,emotion,clarity,claimIds}]
  transcript jsonb not null,
  model text, prompt_version text, input_hash text,
  created_at timestamptz not null default now()
);

create table project_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  claims jsonb not null, -- [{id,field,statement,sources[],status,note}]
  price_list jsonb not null default '[]',
  model text, prompt_version text, input_hash text,
  created_at timestamptz not null default now()
);

create table personas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  key text not null,
  body jsonb not null,
  unique (project_id, key)
);

-- ── Strategy & creative ────────────────────────────────────────────
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  plan jsonb not null, -- calendar, budget split, channel roles
  model text, prompt_version text, input_hash text,
  created_at timestamptz not null default now()
);

create table angles (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  code text not null,
  name text not null,
  promise text,
  stage text not null check (stage in ('awareness', 'consideration', 'conversion', 'retargeting')),
  persona_keys text[] not null default '{}',
  scene_ids text[] not null default '{}',
  claim_ids text[] not null default '{}'
);

create type approval_status as enum ('draft', 'needs_review', 'approved', 'rejected');

create table creative_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  angle_id uuid not null references angles(id) on delete cascade,
  persona_key text not null,
  format text not null check (format in ('reel15', 'feed30', 'carousel', 'story', 'reel6', 'feed60', 'landing')),
  lang text not null check (lang in ('en', 'bm', 'zh')),
  platforms text[] not null,
  scene_ids text[] not null default '{}',
  end_card text not null,
  renders_used boolean not null default true,
  status approval_status not null default 'draft',
  render_path text, -- worker output
  created_at timestamptz not null default now()
);

create table asset_variants (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references creative_assets(id) on delete cascade,
  key text not null check (key in ('A', 'B', 'C')),
  hook text not null, primary_text text not null, headline text not null, cta text not null,
  claim_ids text[] not null default '{}',
  model text, prompt_version text, input_hash text,
  updated_at timestamptz not null default now(),
  unique (asset_id, key)
);

create table compliance_checks (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references creative_assets(id) on delete cascade,
  ruleset_version text not null,
  results jsonb not null, -- [{rule,level,message}]
  verdict text not null check (verdict in ('pass', 'warn', 'block')),
  created_at timestamptz not null default now()
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references creative_assets(id) on delete cascade,
  user_id uuid references auth.users(id),
  decision approval_status not null,
  comment text,
  created_at timestamptz not null default now()
);

create table landing_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  angle_id uuid not null references angles(id) on delete cascade,
  slug text not null,
  pdpa_notice jsonb not null, -- per language
  published boolean not null default false,
  unique (project_id, slug)
);

-- ── Leads → SPA ────────────────────────────────────────────────────
create table leads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  angle_id uuid references angles(id) on delete set null,
  -- personal data: encrypt at rest with pgsodium / Vault column encryption in production
  name text not null,
  phone text not null,
  email text,
  lang text not null default 'en',
  answers jsonb not null default '{}',
  score text not null check (score in ('hot', 'warm', 'cold')),
  stage text not null default 'new',
  utm jsonb not null default '{}',
  consent_at timestamptz not null,
  consent_text_version text not null,
  first_response_at timestamptz,
  created_at timestamptz not null default now()
);

create table lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references leads(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email', 'phone', 'external_bot')),
  messages jsonb not null default '[]',
  handed_off_at timestamptz
);

create table appointment_slots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  negotiator_id uuid references auth.users(id),
  negotiator_name text not null,
  starts_at timestamptz not null
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null unique references appointment_slots(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  reminders jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table outcomes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  outcome text not null check (outcome in ('no_show', 'visited', 'booking_fee', 'spa')),
  spa_value_rm numeric(14, 2),
  logged_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table ad_spend (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  date date not null,
  platform text not null,
  angle_id uuid references angles(id) on delete set null,
  amount_rm numeric(12, 2) not null check (amount_rm >= 0)
);

-- ── Orchestration & audit ──────────────────────────────────────────
create table jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  stage text not null, -- ingest | study | intelligence | strategise | create | comply | cut | report | optimise
  idempotency_key text not null unique,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  input jsonb not null default '{}',
  output jsonb,
  error text,
  attempts int not null default 0,
  locked_at timestamptz,
  created_at timestamptz not null default now()
);
create index jobs_queue on jobs (status, created_at) where status = 'queued';

create table audit_log (
  id bigint generated always as identity primary key,
  project_id uuid references projects(id) on delete cascade,
  actor uuid references auth.users(id),
  actor_label text not null,
  action text not null,
  target text not null,
  detail text,
  created_at timestamptz not null default now()
);

-- ── RLS ────────────────────────────────────────────────────────────
alter table agencies enable row level security;
alter table clients enable row level security;
alter table memberships enable row level security;

create policy agency_read on agencies for select using (exists (select 1 from memberships m where m.agency_id = id and m.user_id = auth.uid()));
create policy client_read on clients for select using (
  exists (select 1 from memberships m where m.agency_id = clients.agency_id and (m.client_id is null or m.client_id = clients.id) and m.user_id = auth.uid())
);
create policy own_memberships on memberships for select using (user_id = auth.uid());

alter table projects enable row level security;
create policy project_read on projects for select using (can_access_project(id));
create policy project_write on projects for update using (can_approve_project(id));

-- Project-scoped tables: read if you can access the project; write if you can approve on it.
do $$
declare t text;
begin
  foreach t in array array['media_assets','video_maps','project_briefs','personas','campaigns','creative_assets','landing_pages','leads','appointment_slots','ad_spend','jobs','audit_log'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (can_access_project(project_id))', t || '_read', t);
    execute format('create policy %I on %I for all using (can_approve_project(project_id)) with check (can_approve_project(project_id))', t || '_write', t);
  end loop;
end $$;

-- Child tables inherit access through their parent.
alter table angles enable row level security;
create policy angles_rw on angles for all using (exists (select 1 from campaigns c where c.id = campaign_id and can_access_project(c.project_id)));

do $$
declare t text;
begin
  foreach t in array array['asset_variants','compliance_checks','approvals'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (exists (select 1 from creative_assets a where a.id = asset_id and can_access_project(a.project_id)))', t || '_read', t);
    execute format('create policy %I on %I for insert with check (exists (select 1 from creative_assets a where a.id = asset_id and can_approve_project(a.project_id)))', t || '_write', t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['lead_events','conversations'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all using (exists (select 1 from leads l where l.id = lead_id and can_access_project(l.project_id)))', t || '_rw', t);
  end loop;
end $$;

alter table appointments enable row level security;
create policy appointments_rw on appointments for all using (exists (select 1 from leads l where l.id = lead_id and can_access_project(l.project_id)));
alter table outcomes enable row level security;
create policy outcomes_rw on outcomes for all using (
  exists (select 1 from appointments a join leads l on l.id = a.lead_id where a.id = appointment_id and can_access_project(l.project_id))
);

-- Public lead capture goes through a server route using the service role; anon has no table access.
-- Approval cannot bypass the gate: an asset may only move to 'approved' when its latest check is not 'block'.
create or replace function enforce_compliance_gate() returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and coalesce((
    select verdict from compliance_checks where asset_id = new.id order by created_at desc limit 1
  ), 'block') = 'block' then
    raise exception 'Asset % is blocked by the compliance gate', new.id;
  end if;
  return new;
end $$;
create trigger creative_assets_gate before update of status on creative_assets for each row execute function enforce_compliance_gate();

-- Audit log is append-only.
create or replace function forbid_audit_mutation() returns trigger language plpgsql as $$
begin raise exception 'audit_log is append-only'; end $$;
create trigger audit_log_immutable before update or delete on audit_log for each row execute function forbid_audit_mutation();
