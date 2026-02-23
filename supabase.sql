create table if not exists public.registrations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  registration_type text not null check (registration_type in ('team', 'individual')),
  contact_email text not null,
  team_name text,
  team_name_pending boolean not null default false,
  player_one_name text not null,
  player_two_name text,
  player_two_pending boolean not null default false
);

alter table public.registrations
  add column if not exists contact_email text,
  add column if not exists team_name_pending boolean not null default false,
  add column if not exists player_two_pending boolean not null default false;

drop policy if exists "Public can insert registrations" on public.registrations;

alter table public.registrations drop constraint if exists player_one_not_blank;
alter table public.registrations drop constraint if exists team_name_not_blank;
alter table public.registrations drop constraint if exists player_two_not_blank;
alter table public.registrations drop constraint if exists contact_email_not_blank;
alter table public.registrations drop constraint if exists contact_email_valid;
alter table public.registrations drop constraint if exists team_name_pending_shape;
alter table public.registrations drop constraint if exists player_two_pending_shape;
alter table public.registrations drop constraint if exists registration_shape;

alter table public.registrations
  add constraint player_one_not_blank check (char_length(btrim(player_one_name)) > 0),
  add constraint team_name_not_blank check (team_name is null or char_length(btrim(team_name)) > 0),
  add constraint player_two_not_blank check (player_two_name is null or char_length(btrim(player_two_name)) > 0),
  add constraint contact_email_not_blank check (
    contact_email is null or char_length(btrim(contact_email)) > 0
  ),
  add constraint contact_email_valid check (
    contact_email is null or contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  add constraint team_name_pending_shape check (
    not team_name_pending or team_name is null
  ),
  add constraint player_two_pending_shape check (
    not player_two_pending or player_two_name is null
  ),
  add constraint registration_shape check (
    (
      registration_type = 'team'
      and (team_name is not null or team_name_pending)
      and (player_two_name is not null or player_two_pending)
    )
    or (
      registration_type = 'individual'
      and team_name is null
      and player_two_name is null
      and team_name_pending = false
      and player_two_pending = false
    )
  );

alter table public.registrations enable row level security;

create policy "Public can insert registrations"
on public.registrations
for insert
to anon
with check (true);

create extension if not exists pgcrypto;

create table if not exists public.admin_export_keys (
  id smallint primary key default 1 check (id = 1),
  key_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_export_keys enable row level security;

create or replace function public.export_registrations(p_key text)
returns table (
  created_at timestamptz,
  registration_type text,
  contact_email text,
  team_name text,
  team_name_pending boolean,
  player_one_name text,
  player_two_name text,
  player_two_pending boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  select key_hash into v_hash
  from public.admin_export_keys
  where id = 1;

  if v_hash is null or p_key is null or crypt(p_key, v_hash) <> v_hash then
    raise exception 'Neplatný exportní klíč.';
  end if;

  return query
  select
    r.created_at,
    r.registration_type,
    r.contact_email,
    r.team_name,
    r.team_name_pending,
    r.player_one_name,
    r.player_two_name,
    r.player_two_pending
  from public.registrations r
  order by r.created_at asc;
end;
$$;

grant execute on function public.export_registrations(text) to anon;
