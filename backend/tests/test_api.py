from uuid import UUID

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from pydantic import SecretStr
import pytest
from supabase_auth.errors import AuthApiError

from app.core.config import settings
from app.db import dependencies as auth_dependencies
from app.db.dependencies import get_authenticated_repository, get_repository
from app.main import app

client = TestClient(app)
USER_ID = "00000000-0000-0000-0000-000000000001"
GAME_ID = "00000000-0000-0000-0000-000000000002"


class FakeRepository:
    def __init__(self) -> None:
        self.queries: list[tuple[str, dict[str, object]]] = []
        self.rows = {
            "player_directory": [
                {
                    "id": USER_ID,
                    "display_name": "Test Player",
                }
            ],
            "player_profiles": [
                {
                    "id": USER_ID,
                    "display_name": "Test Player",
                    "favorite_games": ["Valorant"],
                    "platform": "PC",
                    "country": "Japan",
                }
            ],
            "games": [
                {
                    "id": GAME_ID,
                    "slug": "valorant",
                    "name": "Valorant",
                    "genre": "Tactical FPS",
                }
            ],
            "community_directory": [
                {
                    "id": GAME_ID,
                    "name": "Test Community",
                    "game_id": GAME_ID,
                    "region": "Global",
                    "member_count": 1,
                    "description": None,
                }
            ],
            "team_directory": [
                {
                    "id": GAME_ID,
                    "name": "Test Team",
                    "game_id": GAME_ID,
                    "region": "Global",
                    "member_count": 1,
                }
            ],
            "tournaments": [
                {
                    "id": GAME_ID,
                    "name": "Test Tournament",
                    "game_id": GAME_ID,
                    "starts_at": "2026-12-01T12:00:00Z",
                    "status": "upcoming",
                }
            ],
            "leaderboard_entries": [
                {
                    "user_id": USER_ID,
                    "game_id": GAME_ID,
                    "score": 1234.5,
                }
            ],
        }

    @staticmethod
    def apply_aliases(row: dict[str, object], columns: object) -> dict[str, object]:
        result = dict(row)
        if isinstance(columns, str):
            for selection in columns.split(","):
                if ":" in selection:
                    alias, source = selection.split(":", maxsplit=1)
                    if source in result:
                        result[alias] = result.pop(source)
        return result

    def list_rows(self, table: str, **kwargs: object) -> list[dict[str, object]]:
        self.queries.append((table, kwargs))
        return [
            self.apply_aliases(row, kwargs.get("columns"))
            for row in self.rows.get(table, [])
        ]

    def get_row(
        self,
        table: str,
        resource_id: str,
        **kwargs: object,
    ) -> dict[str, object] | None:
        self.queries.append((table, {"resource_id": resource_id, **kwargs}))
        return next(
            (
                self.apply_aliases(row, kwargs.get("columns"))
                for row in self.rows.get(table, [])
                if row.get("id") == resource_id
            ),
            None,
        )


@pytest.fixture
def repository():
    fake_repository = FakeRepository()
    app.dependency_overrides[get_repository] = lambda: fake_repository
    yield fake_repository
    app.dependency_overrides.clear()


def test_resource_collections_return_typed_data(repository: FakeRepository) -> None:
    paths = [
        "/api/v1/users",
        "/api/v1/games",
        "/api/v1/communities",
        "/api/v1/teams",
        "/api/v1/tournaments",
        "/api/v1/leaderboards",
    ]

    for path in paths:
        response = client.get(path)
        assert response.status_code == 200
        assert len(response.json()) == 1
    assert [table for table, _ in repository.queries] == [
        "player_directory",
        "games",
        "community_directory",
        "team_directory",
        "tournaments",
        "leaderboard_entries",
    ]


def test_public_user_directory_uses_safe_projection(
    repository: FakeRepository,
) -> None:
    response = client.get("/api/v1/users")

    assert response.status_code == 200
    assert response.json() == [{"user_id": USER_ID, "display_name": "Test Player"}]
    assert repository.queries[-1][0] == "player_directory"


def test_public_user_directory_rejects_private_country_filter(
    repository: FakeRepository,
) -> None:
    response = client.get("/api/v1/users", params={"country": "Japan"})

    assert response.status_code == 422
    assert "country remains private" in response.json()["detail"]
    assert repository.queries == []


def test_private_profile_requires_authentication(repository: FakeRepository) -> None:
    response = client.get(f"/api/v1/profiles/{USER_ID}")

    assert response.status_code == 401
    assert repository.queries == []


def test_authenticated_user_can_read_own_private_profile(
    repository: FakeRepository,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )

    response = client.get(f"/api/v1/profiles/{USER_ID}")

    assert response.status_code == 200
    assert response.json() == {
        "user_id": USER_ID,
        "display_name": "Test Player",
        "favorite_games": ["Valorant"],
        "platform": "PC",
        "country": "Japan",
    }


def test_authenticated_user_cannot_read_another_private_profile(
    repository: FakeRepository,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )
    other_user_id = "00000000-0000-0000-0000-000000000003"

    response = client.get(f"/api/v1/profiles/{other_user_id}")

    assert response.status_code == 404
    assert repository.queries == []


def test_invalid_bearer_token_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    class InvalidAuthClient:
        @staticmethod
        def get_user(token: str) -> None:
            assert token == "invalid-token"
            raise AuthApiError("Invalid token", 401, None)

    monkeypatch.setattr(
        auth_dependencies.settings,
        "supabase_url",
        "https://example.supabase.co",
    )
    monkeypatch.setattr(
        auth_dependencies.settings,
        "supabase_anon_key",
        SecretStr("test-anon-key"),
    )
    invalid_client = type("Client", (), {"auth": InvalidAuthClient()})()

    def create_invalid_client(url: str, key: str) -> object:
        assert url == "https://example.supabase.co"
        assert key == "test-anon-key"
        return invalid_client

    monkeypatch.setattr(auth_dependencies, "create_client", create_invalid_client)
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="invalid-token",
    )

    with pytest.raises(HTTPException) as error:
        get_authenticated_repository(credentials)

    assert error.value.status_code == 401


def test_valid_bearer_token_is_forwarded_to_rls_client(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakePostgrest:
        token: str | None = None

        def auth(self, token: str) -> None:
            self.token = token

    class ValidAuthClient:
        @staticmethod
        def get_user(token: str) -> object:
            assert token == "valid-token"
            user = type("User", (), {"id": USER_ID})()
            return type("AuthResponse", (), {"user": user})()

    class FakeClient:
        def __init__(self) -> None:
            self.auth = ValidAuthClient()
            self.postgrest = FakePostgrest()

    fake_client = FakeClient()
    monkeypatch.setattr(
        auth_dependencies.settings,
        "supabase_url",
        "https://example.supabase.co",
    )
    monkeypatch.setattr(
        auth_dependencies.settings,
        "supabase_anon_key",
        SecretStr("test-anon-key"),
    )
    def create_test_client(url: str, key: str) -> FakeClient:
        assert url == "https://example.supabase.co"
        assert key == "test-anon-key"
        return fake_client

    monkeypatch.setattr(auth_dependencies, "create_client", create_test_client)
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="valid-token",
    )

    authenticated_user_id, repository = get_authenticated_repository(credentials)

    assert authenticated_user_id == UUID(USER_ID)
    assert repository.client is fake_client
    assert fake_client.postgrest.token == "valid-token"


def test_game_filter_is_sent_to_supabase_repository(repository: FakeRepository) -> None:
    response = client.get(f"/api/v1/communities?game_id={GAME_ID}")

    assert response.status_code == 200
    assert repository.queries[-1][1]["filters"] == {"game_id": GAME_ID}


def test_leaderboard_assigns_filtered_rank(repository: FakeRepository) -> None:
    response = client.get(
        "/api/v1/leaderboards",
        params={"scope": "global", "offset": 2},
    )

    assert response.status_code == 200
    assert response.json()[0]["rank"] == 3
    assert repository.queries[-1][1]["filters"] is None


def test_health_reports_database_is_not_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "supabase_url", None)
    monkeypatch.setattr(settings, "supabase_anon_key", None)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "api_version": "0.1.0",
        "data_backend": "not_configured",
    }


def test_missing_supabase_configuration_returns_service_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "supabase_url", None)
    monkeypatch.setattr(settings, "supabase_anon_key", None)

    response = client.get("/api/v1/games")

    assert response.status_code == 503
    assert "SUPABASE_URL" in response.json()["detail"]


def test_resource_detail_reports_not_found(repository: FakeRepository) -> None:
    response = client.get("/api/v1/games/00000000-0000-0000-0000-000000000003")

    assert response.status_code == 404
    assert response.json()["detail"].startswith("Game ")
    assert repository.queries[-1][0] == "games"


def test_country_leaderboard_is_disabled_while_country_is_private(
    repository: FakeRepository,
) -> None:
    response = client.get(
        "/api/v1/leaderboards",
        params={"scope": "country", "country": "Japan"},
    )

    assert response.status_code == 422
    assert "opt in" in response.json()["detail"]
    assert repository.queries == []


def test_invalid_pagination_is_rejected(repository: FakeRepository) -> None:
    response = client.get("/api/v1/teams", params={"limit": 101})
    excessive_offset = client.get("/api/v1/teams", params={"offset": 10001})

    assert response.status_code == 422
    assert excessive_offset.status_code == 422
    assert repository.queries == []


def test_frontend_origin_is_allowed_by_cors() -> None:
    response = client.get(
        "/health",
        headers={"Origin": "http://localhost:5173"},
    )

    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_openapi_lists_resource_groups() -> None:
    response = client.get("/openapi.json")
    tags = {tag["name"] for tag in response.json()["tags"]}

    assert {"Users", "Profiles", "Games", "Communities", "Teams", "Tournaments", "Leaderboards"} <= tags
