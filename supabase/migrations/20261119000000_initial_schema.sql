create table public.games (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (char_length(slug) between 1 and 80),
    name text not null check (char_length(name) between 1 and 120),
    genre text,
    created_at timestamptz not null default now()
);

insert into public.games (slug, name, genre)
values
    ('valorant', 'Valorant', 'Tactical FPS'),
    ('apex-legends', 'Apex Legends', 'Battle royale'),
    ('counter-strike-2', 'Counter-Strike 2', 'Tactical FPS'),
    ('league-of-legends', 'League of Legends', 'MOBA')
on conflict (slug) do nothing;

create table public.player_profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null default 'Player' check (char_length(display_name) between 1 and 80),
    favorite_games text[] not null default '{}',
    platform text check (platform is null or char_length(platform) <= 80),
    country text check (country is null or char_length(country) <= 56),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.communities (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 1 and 120),
    game_id uuid not null references public.games (id) on delete restrict,
    region text not null check (char_length(region) between 1 and 80),
    description text,
    owner_id uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.community_members (
    community_id uuid not null references public.communities (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
    joined_at timestamptz not null default now(),
    primary key (community_id, user_id)
);

create table public.teams (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 1 and 80),
    game_id uuid not null references public.games (id) on delete restrict,
    region text not null check (char_length(region) between 1 and 80),
    description text,
    owner_id uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.team_members (
    team_id uuid not null references public.teams (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    role text not null default 'member' check (role in ('owner', 'captain', 'member')),
    joined_at timestamptz not null default now(),
    primary key (team_id, user_id)
);

create table public.tournaments (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 1 and 160),
    game_id uuid not null references public.games (id) on delete restrict,
    starts_at timestamptz not null,
    status text not null default 'upcoming'
        check (status in ('upcoming', 'registration_open', 'in_progress', 'completed')),
    prize_pool numeric(12, 2) not null default 0 check (prize_pool >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.tournament_registrations (
    id uuid primary key default gen_random_uuid(),
    tournament_id uuid not null references public.tournaments (id) on delete cascade,
    player_id uuid references auth.users (id) on delete cascade,
    team_id uuid references public.teams (id) on delete cascade,
    registered_by uuid not null references auth.users (id) on delete cascade,
    status text not null default 'registered'
        check (status in ('registered', 'confirmed', 'withdrawn')),
    registered_at timestamptz not null default now(),
    check ((player_id is null) <> (team_id is null))
);

create unique index tournament_registrations_player_unique
    on public.tournament_registrations (tournament_id, player_id)
    where player_id is not null and status <> 'withdrawn';
create unique index tournament_registrations_team_unique
    on public.tournament_registrations (tournament_id, team_id)
    where team_id is not null and status <> 'withdrawn';

create table public.matches (
    id uuid primary key default gen_random_uuid(),
    tournament_id uuid not null references public.tournaments (id) on delete cascade,
    round_number integer not null check (round_number > 0),
    match_number integer not null check (match_number > 0),
    team_one_id uuid references public.teams (id) on delete set null,
    team_two_id uuid references public.teams (id) on delete set null,
    status text not null default 'scheduled'
        check (status in ('scheduled', 'in_progress', 'completed')),
    results_published boolean not null default false,
    scheduled_at timestamptz,
    created_at timestamptz not null default now(),
    unique (tournament_id, round_number, match_number),
    check (team_one_id is null or team_two_id is null or team_one_id <> team_two_id)
);

create table public.match_results (
    match_id uuid primary key references public.matches (id) on delete cascade,
    winner_team_id uuid references public.teams (id) on delete set null,
    team_one_score integer not null check (team_one_score >= 0),
    team_two_score integer not null check (team_two_score >= 0),
    verified_at timestamptz,
    created_at timestamptz not null default now()
);

create table public.achievements (
    id uuid primary key default gen_random_uuid(),
    code text not null unique check (char_length(code) between 1 and 80),
    name text not null check (char_length(name) between 1 and 120),
    description text not null,
    icon text,
    created_at timestamptz not null default now()
);

create table public.player_achievements (
    user_id uuid not null references auth.users (id) on delete cascade,
    achievement_id uuid not null references public.achievements (id) on delete cascade,
    earned_at timestamptz not null default now(),
    primary key (user_id, achievement_id)
);

create table public.player_game_stats (
    user_id uuid not null references auth.users (id) on delete cascade,
    game_id uuid not null references public.games (id) on delete cascade,
    rating numeric(12, 2) not null default 0 check (rating >= 0),
    matches_played integer not null default 0 check (matches_played >= 0),
    wins integer not null default 0 check (wins >= 0),
    losses integer not null default 0 check (losses >= 0),
    updated_at timestamptz not null default now(),
    primary key (user_id, game_id),
    check (wins + losses <= matches_played)
);

create index player_profiles_country_idx on public.player_profiles (country);
create index player_profiles_display_name_idx on public.player_profiles (display_name);
create index communities_game_region_idx on public.communities (game_id, region);
create index community_members_user_idx on public.community_members (user_id);
create index teams_game_region_idx on public.teams (game_id, region);
create index team_members_user_idx on public.team_members (user_id);
create index tournaments_game_status_start_idx
    on public.tournaments (game_id, status, starts_at);
create index tournament_registrations_tournament_idx
    on public.tournament_registrations (tournament_id, status);
create index matches_tournament_round_idx
    on public.matches (tournament_id, round_number);
create index player_achievements_achievement_idx
    on public.player_achievements (achievement_id);
create index player_game_stats_leaderboard_idx
    on public.player_game_stats (game_id, rating desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger player_profiles_set_updated_at
    before update on public.player_profiles
    for each row execute function public.set_updated_at();
create trigger communities_set_updated_at
    before update on public.communities
    for each row execute function public.set_updated_at();
create trigger teams_set_updated_at
    before update on public.teams
    for each row execute function public.set_updated_at();
create trigger tournaments_set_updated_at
    before update on public.tournaments
    for each row execute function public.set_updated_at();

create function public.sync_player_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    favorite_games_value text[] := '{}';
begin
    if jsonb_typeof(new.raw_user_meta_data -> 'favorite_games') = 'array' then
        select coalesce(array_agg(value), '{}')
        into favorite_games_value
        from jsonb_array_elements_text(new.raw_user_meta_data -> 'favorite_games') as items(value);
    end if;

    insert into public.player_profiles (id, display_name, favorite_games, platform, country)
    values (
        new.id,
        coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Player'),
        favorite_games_value,
        nullif(new.raw_user_meta_data ->> 'platform', ''),
        nullif(new.raw_user_meta_data ->> 'country', '')
    )
    on conflict (id) do update set
        display_name = excluded.display_name,
        favorite_games = excluded.favorite_games,
        platform = excluded.platform,
        country = excluded.country;

    return new;
end;
$$;

create trigger auth_user_sync_player_profile
    after insert or update on auth.users
    for each row execute function public.sync_player_profile_from_auth();

insert into public.player_profiles (id, display_name, favorite_games, platform, country)
select
    users.id,
    coalesce(nullif(users.raw_user_meta_data ->> 'display_name', ''), 'Player'),
    case
        when jsonb_typeof(users.raw_user_meta_data -> 'favorite_games') = 'array'
            then array(
                select jsonb_array_elements_text(users.raw_user_meta_data -> 'favorite_games')
            )
        else '{}'::text[]
    end,
    nullif(users.raw_user_meta_data ->> 'platform', ''),
    nullif(users.raw_user_meta_data ->> 'country', '')
from auth.users as users
on conflict (id) do nothing;

create function public.add_community_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.community_members (community_id, user_id, role)
    values (new.id, new.owner_id, 'owner');
    return new;
end;
$$;

create trigger communities_add_owner
    after insert on public.communities
    for each row execute function public.add_community_owner();

create function public.add_team_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.team_members (team_id, user_id, role)
    values (new.id, new.owner_id, 'owner');
    return new;
end;
$$;

create trigger teams_add_owner
    after insert on public.teams
    for each row execute function public.add_team_owner();

create view public.community_directory as
select
    communities.id,
    communities.name,
    communities.game_id,
    communities.region,
    count(community_members.user_id)::integer as member_count,
    communities.description
from public.communities
left join public.community_members on community_members.community_id = communities.id
group by communities.id;

create view public.team_directory as
select
    teams.id,
    teams.name,
    teams.game_id,
    teams.region,
    count(team_members.user_id)::integer as member_count
from public.teams
left join public.team_members on team_members.team_id = teams.id
group by teams.id;

create view public.player_directory with (security_invoker = false) as
select
    player_profiles.id,
    player_profiles.display_name
from public.player_profiles;

comment on view public.player_directory is
    'Public profile projection; intentionally exposes only user ID and display name.';

create view public.leaderboard_entries with (security_invoker = true) as
select
    player_game_stats.user_id,
    player_game_stats.game_id,
    player_game_stats.rating::double precision as score
from public.player_game_stats;

comment on view public.community_directory is
    'Public community metadata and aggregate membership counts; does not expose member identities.';
comment on view public.team_directory is
    'Public team metadata and aggregate membership counts; does not expose member identities.';

alter table public.games enable row level security;
alter table public.player_profiles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.matches enable row level security;
alter table public.match_results enable row level security;
alter table public.achievements enable row level security;
alter table public.player_achievements enable row level security;
alter table public.player_game_stats enable row level security;

create policy "games are readable by everyone"
    on public.games for select to anon, authenticated using (true);
create policy "users can read their own profile"
    on public.player_profiles for select to authenticated
    using (id = (select auth.uid()));
create policy "users can update their own profile"
    on public.player_profiles for update to authenticated
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));
create policy "communities are publicly readable"
    on public.communities for select to anon, authenticated using (true);
create policy "users can create communities they own"
    on public.communities for insert to authenticated
    with check (owner_id = (select auth.uid()));
create policy "community owners can update their communities"
    on public.communities for update to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));
create policy "community owners can delete their communities"
    on public.communities for delete to authenticated
    using (owner_id = (select auth.uid()));
create policy "users can read their own community memberships"
    on public.community_members for select to authenticated
    using (user_id = (select auth.uid()));
create policy "users can join communities as members"
    on public.community_members for insert to authenticated
    with check (user_id = (select auth.uid()) and role = 'member');
create policy "users can leave communities"
    on public.community_members for delete to authenticated
    using (user_id = (select auth.uid()));
create policy "teams are publicly readable"
    on public.teams for select to anon, authenticated using (true);
create policy "users can create teams they own"
    on public.teams for insert to authenticated
    with check (owner_id = (select auth.uid()));
create policy "team owners can update their teams"
    on public.teams for update to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));
create policy "team owners can delete their teams"
    on public.teams for delete to authenticated
    using (owner_id = (select auth.uid()));
create policy "users can read their own team memberships"
    on public.team_members for select to authenticated
    using (user_id = (select auth.uid()));
create policy "users can join teams as members"
    on public.team_members for insert to authenticated
    with check (user_id = (select auth.uid()) and role = 'member');
create policy "users can leave teams"
    on public.team_members for delete to authenticated
    using (user_id = (select auth.uid()));
create policy "tournaments are publicly readable"
    on public.tournaments for select to anon, authenticated using (true);
create policy "users can read registrations they submitted"
    on public.tournament_registrations for select to authenticated
    using (registered_by = (select auth.uid()));
create policy "users can register themselves or a team they belong to"
    on public.tournament_registrations for insert to authenticated
    with check (
        registered_by = (select auth.uid())
        and status = 'registered'
        and exists (
            select 1
            from public.tournaments
            where tournaments.id = tournament_registrations.tournament_id
              and tournaments.status = 'registration_open'
        )
        and (
            (player_id = (select auth.uid()) and team_id is null)
            or (
                player_id is null
                and team_id is not null
                and exists (
                    select 1
                    from public.team_members
                    where team_members.team_id = tournament_registrations.team_id
                      and team_members.user_id = (select auth.uid())
                      and exists (
                          select 1
                          from public.teams
                          join public.tournaments
                            on tournaments.id = tournament_registrations.tournament_id
                          where teams.id = team_members.team_id
                            and teams.game_id = tournaments.game_id
                      )
                )
            )
        )
    );
create policy "completed matches are publicly readable"
    on public.matches for select to anon, authenticated
    using (status = 'completed' and results_published);
create policy "verified match results are publicly readable"
    on public.match_results for select to anon, authenticated
    using (
        verified_at is not null
        and exists (
            select 1
            from public.matches
            where matches.id = match_results.match_id
              and matches.status = 'completed'
              and matches.results_published
        )
    );
create policy "achievements are publicly readable"
    on public.achievements for select to anon, authenticated using (true);
create policy "player achievements are publicly readable"
    on public.player_achievements for select to anon, authenticated using (true);
create policy "player game stats are publicly readable"
    on public.player_game_stats for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;
grant select on public.games, public.communities,
    public.teams, public.tournaments, public.matches, public.match_results,
    public.achievements, public.player_achievements, public.player_game_stats
    to anon, authenticated;
revoke all on table public.player_profiles from public, anon, authenticated;
grant select on public.player_profiles to authenticated;
grant select on public.community_members, public.team_members to authenticated;
grant update (display_name, favorite_games, platform, country)
    on public.player_profiles to authenticated;
grant insert, update, delete on public.communities, public.community_members,
    public.teams, public.team_members to authenticated;
revoke all on table public.tournament_registrations from public, anon, authenticated;
grant select, insert on public.tournament_registrations to authenticated;
revoke all on table public.player_directory from public, anon, authenticated;
grant select on public.community_directory, public.team_directory,
    public.player_directory,
    public.leaderboard_entries to anon, authenticated;
