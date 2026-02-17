create table if not exists public.registrations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  registration_type text not null check (registration_type in ('team', 'individual')),
  team_name text,
  player_one_name text not null,
  player_two_name text,
  constraint player_one_not_blank check (char_length(btrim(player_one_name)) > 0),
  constraint team_name_not_blank check (team_name is null or char_length(btrim(team_name)) > 0),
  constraint player_two_not_blank check (player_two_name is null or char_length(btrim(player_two_name)) > 0),
  constraint registration_shape check (
    (registration_type = 'team' and team_name is not null and player_two_name is not null) or
    (registration_type = 'individual' and team_name is null and player_two_name is null)
  )
);

alter table public.registrations enable row level security;

drop policy if exists "Public can insert registrations" on public.registrations;
create policy "Public can insert registrations"
on public.registrations
for insert
to anon
with check (true);
