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
