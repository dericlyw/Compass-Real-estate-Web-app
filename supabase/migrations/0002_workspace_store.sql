-- Test/pilot storage: the whole workspace as one JSONB document per workspace id.
-- Used by lib/data/store.ts when SUPABASE_URL, SUPABASE_KEY and PROPVID_DB_TOKEN are set.
--
-- The tables are closed to every API role (RLS on, no policies, privileges revoked). The app
-- reaches them only through two SECURITY DEFINER functions that require a shared secret token,
-- so the public (anon/publishable) key alone cannot read or write anything. Tables are
-- prefixed `propvid_` so this can live safely inside an existing project.
-- Writes are guarded by `rev` (optimistic concurrency). The relational schema in 0001_init.sql
-- remains the production target.

create table if not exists public.propvid_workspace (
  id         text primary key,
  data       jsonb not null,
  rev        integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.propvid_secret (
  id         integer primary key default 1 check (id = 1),
  token_hash text not null -- sha256 hex of PROPVID_DB_TOKEN; set once, outside this migration
);

alter table public.propvid_workspace enable row level security;
alter table public.propvid_secret enable row level security;
revoke all on public.propvid_workspace, public.propvid_secret from anon, authenticated;

create or replace function public.propvid_check(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_token is null or not exists (
    select 1 from public.propvid_secret where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  ) then
    raise exception 'access denied' using errcode = '42501';
  end if;
end $$;

create or replace function public.propvid_load(p_id text, p_token text)
returns table (data jsonb, rev integer)
language plpgsql security definer set search_path = public as $$
begin
  perform public.propvid_check(p_token);
  return query select w.data, w.rev from public.propvid_workspace w where w.id = p_id;
end $$;

-- p_rev = 0 creates the row; otherwise updates only if the stored rev still matches.
-- Returns false when another writer got there first.
create or replace function public.propvid_save(p_id text, p_token text, p_data jsonb, p_rev integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform public.propvid_check(p_token);
  if p_rev = 0 then
    insert into public.propvid_workspace (id, data, rev) values (p_id, p_data, 1) on conflict (id) do nothing;
  else
    update public.propvid_workspace set data = p_data, rev = p_rev + 1, updated_at = now() where id = p_id and rev = p_rev;
  end if;
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.propvid_check(text) from public, anon, authenticated;
revoke all on function public.propvid_load(text, text) from public;
revoke all on function public.propvid_save(text, text, jsonb, integer) from public;
grant execute on function public.propvid_load(text, text) to anon, authenticated;
grant execute on function public.propvid_save(text, text, jsonb, integer) to anon, authenticated;
