from pathlib import Path
import re

from pglast import parse_sql


def test_initial_schema_migration_parses_as_postgresql() -> None:
    statements = parse_sql(read_migration())

    assert statements


def read_migration() -> str:
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "supabase"
        / "migrations"
        / "20261119000000_initial_schema.sql"
    )
    return migration_path.read_text(encoding="utf-8").lower()


def read_profile_migration() -> str:
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "supabase"
        / "migrations"
        / "20261120000000_player_profile_fields.sql"
    )
    return migration_path.read_text(encoding="utf-8").lower()


def read_community_migration() -> str:
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "supabase"
        / "migrations"
        / "20261120131745_community_creation_fields.sql"
    )
    return migration_path.read_text(encoding="utf-8").lower()


def read_community_idempotency_migration() -> str:
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "supabase"
        / "migrations"
        / "20261120164600_community_creation_idempotency.sql"
    )
    return migration_path.read_text(encoding="utf-8").lower()


def test_profile_table_is_private_and_public_view_is_limited() -> None:
    migration = read_migration()

    assert 'create policy "users can read their own profile"' in migration
    assert 'create policy "profiles are publicly readable"' not in migration
    assert "revoke all on table public.player_profiles from public, anon, authenticated;" in migration
    assert "grant select on public.player_profiles to authenticated;" in migration

    view_sql = migration.split("create view public.player_directory", 1)[1].split(
        "create view public.leaderboard_entries",
        1,
    )[0]
    assert "security_invoker = false" in view_sql
    assert "player_profiles.id" in view_sql
    assert "player_profiles.display_name" in view_sql
    assert "favorite_games" not in view_sql
    assert "platform" not in view_sql
    assert "country" not in view_sql


def test_player_profile_migration_adds_validated_fields_without_weakening_rls() -> None:
    migration = read_profile_migration()
    initial_schema = read_migration()

    assert parse_sql(migration)
    assert "add column username text" in migration
    assert "add column avatar_url text" in migration
    assert "add column bio text" in migration
    assert "player_profiles_username_unique" in migration
    assert "lower(username)" in migration
    assert "char_length(bio) <= 280" in migration
    assert 'create policy "users can update their own profile"' in initial_schema
    assert "id = (select auth.uid())" in initial_schema
    assert "drop policy" not in migration
    assert "create policy" not in migration
    assert "grant update (display_name, favorite_games, platform, country, username, avatar_url, bio)" in migration


def test_auth_profile_sync_does_not_run_on_unrelated_auth_user_updates() -> None:
    migration = read_profile_migration()

    assert "after insert on auth.users" in migration
    assert "after update of raw_user_meta_data on auth.users" in migration
    assert "after insert or update on auth.users" not in migration


def test_leaderboard_view_does_not_read_private_profile_fields() -> None:
    migration = read_migration()

    view_sql = migration.split("create view public.leaderboard_entries", 1)[1].split(
        "comment on view public.community_directory",
        1,
    )[0]
    assert "security_invoker = true" in view_sql
    assert "from public.player_game_stats" in view_sql
    assert "player_profiles" not in view_sql
    assert "country" not in view_sql


def test_tournament_registration_grants_match_insert_and_read_policies() -> None:
    migration = re.sub(r"\s+", " ", read_migration())

    assert "grant select, insert on public.tournament_registrations to authenticated;" in migration
    assert "grant insert, update, delete on public.communities, public.community_members, public.teams, public.team_members to authenticated;" in migration
    assert "grant insert, update, delete on public.tournament_registrations" not in migration
    assert 'create policy "users can register themselves or a team they belong to"' in migration


def test_initial_schema_preserves_tables_and_seed_games() -> None:
    migration = read_migration()

    assert migration.count("create table public.") == 13
    seed_values = migration.split("insert into public.games", 1)[1].split(
        "on conflict (slug)",
        1,
    )[0]
    assert len(re.findall(r"^\s+\('[^']+', '[^']+', '[^']+'\),?$", seed_values, re.MULTILINE)) == 4


def test_community_migration_adds_https_image_urls_and_preserves_directory() -> None:
    migration = read_community_migration()
    initial_schema = read_migration()
    normalized_migration = re.sub(r"\s+", " ", migration)

    assert parse_sql(migration)
    assert "add column logo_url text" in migration
    assert "add column banner_url text" in migration
    assert "char_length(logo_url) <= 2048" in migration
    assert "char_length(banner_url) <= 2048" in migration
    assert "logo_url ~* '^https://" in migration
    assert "banner_url ~* '^https://" in migration
    assert "create or replace view public.community_directory as" in migration
    assert (
        "create or replace view public.community_directory as select communities.id, "
        "communities.name, communities.game_id, communities.region, "
        "count(community_members.user_id)::integer as member_count, "
        "communities.description, communities.logo_url, communities.banner_url "
        "from public.communities left join public.community_members "
        "on community_members.community_id = communities.id group by communities.id"
    ) in normalized_migration
    assert "drop policy" not in migration
    assert "create policy" not in migration
    assert "drop trigger" not in migration
    assert 'create trigger communities_add_owner' in initial_schema
    assert 'create policy "users can create communities they own"' in initial_schema


def test_community_idempotency_migration_is_private_and_atomic() -> None:
    migration = read_community_idempotency_migration()
    initial_schema = read_migration()
    normalized_migration = re.sub(r"\s+", " ", migration)

    assert parse_sql(migration)
    assert "create schema nexus_private" in migration
    assert "create table nexus_private.community_creation_requests" in migration
    assert "primary key (owner_id, idempotency_key)" in normalized_migration
    assert "request_payload jsonb not null" in migration
    assert "alter table nexus_private.community_creation_requests enable row level security" in migration
    assert "owner_id = (select auth.uid())" in migration
    assert "revoke all on schema nexus_private from public, anon, authenticated" in migration
    assert "grant usage on schema nexus_private to authenticated" in migration
    assert (
        "grant select, insert, update on table nexus_private.community_creation_requests "
        "to authenticated"
    ) in normalized_migration

    function_sql = migration.split(
        "create function public.create_community_idempotently",
        1,
    )[1]
    assert "security invoker" in function_sql
    assert "set search_path = ''" in function_sql
    assert "v_owner_id uuid := auth.uid()" in function_sql
    assert "on conflict (owner_id, idempotency_key) do nothing" in function_sql
    assert "for update" in function_sql
    assert "v_request.request_payload is distinct from v_payload" in function_sql
    assert "insert into public.communities" in function_sql
    assert "update nexus_private.community_creation_requests" in function_sql
    assert "return query select v_community_id" in function_sql
    assert "p_owner_id" not in function_sql
    assert "grant execute on function public.create_community_idempotently" in function_sql
    assert "to authenticated" in function_sql
    assert "from public, anon, authenticated" in function_sql
    assert "drop policy" not in migration
    assert "drop trigger" not in migration
    assert 'create trigger communities_add_owner' in initial_schema
    assert 'create policy "users can create communities they own"' in initial_schema
