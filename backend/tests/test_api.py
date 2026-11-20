from concurrent.futures import ThreadPoolExecutor
from threading import Lock
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
COMMUNITY_ID = "00000000-0000-0000-0000-000000000003"
IDEMPOTENCY_KEY = "00000000-0000-0000-0000-000000000004"


class FakeRepository:
    def __init__(self) -> None:
        self.queries: list[tuple[str, dict[str, object]]] = []
        self.community_creation_requests: dict[
            str,
            tuple[dict[str, object], dict[str, object]],
        ] = {}
        self.community_creation_count = 0
        self.community_creation_lock = Lock()
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
                    "username": "test_player",
                    "avatar_url": None,
                    "bio": None,
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
                    "logo_url": None,
                    "banner_url": None,
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

    def update_player_profile(
        self,
        user_id: str,
        fields: dict[str, object],
    ) -> dict[str, object] | None:
        self.queries.append(
            ("player_profiles:update", {"user_id": user_id, "fields": fields})
        )
        profile = next(
            (
                row
                for row in self.rows["player_profiles"]
                if row["id"] == user_id
            ),
            None,
        )
        if profile is None:
            return None
        profile.update(fields)
        return self.apply_aliases(
            profile,
            (
                "user_id:id,display_name,username,avatar_url,bio,"
                "favorite_games,platform,country"
            ),
        )

    def create_community(
        self,
        fields: dict[str, object],
        idempotency_key: UUID,
    ) -> dict[str, object]:
        key = str(idempotency_key)
        with self.community_creation_lock:
            self.queries.append(
                (
                    "communities:create",
                    {"idempotency_key": key, "fields": fields},
                )
            )
            existing = self.community_creation_requests.get(key)
            if existing is not None:
                previous_fields, previous_community = existing
                if previous_fields != fields:
                    raise HTTPException(
                        status_code=409,
                        detail="This idempotency key was already used with different community details.",
                    )
                return previous_community

            self.community_creation_count += 1
            community = {
                "id": COMMUNITY_ID,
                "name": fields["name"],
                "game_id": fields["game_id"],
                "region": fields["region"],
                "member_count": 1,
                "description": fields["description"],
                "logo_url": fields["logo_url"],
                "banner_url": fields["banner_url"],
            }
            response = self.apply_aliases(
                community,
                (
                    "community_id:id,name,game_id,region,member_count,description,"
                    "logo_url,banner_url"
                ),
            )
            self.community_creation_requests[key] = (dict(fields), response)
            return response


@pytest.fixture
def repository():
    fake_repository = FakeRepository()
    app.dependency_overrides[get_repository] = lambda: fake_repository
    yield fake_repository
    app.dependency_overrides.clear()


def valid_community_create() -> dict[str, object]:
    return {
        "name": "Nexus Raiders",
        "game_id": GAME_ID,
        "region": "Global",
        "description": "A community for coordinated matches.",
        "logo_url": "https://images.example.com/logo.png",
        "banner_url": None,
    }


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


def test_community_list_and_detail_still_return_directory_data(
    repository: FakeRepository,
) -> None:
    list_response = client.get("/api/v1/communities")
    detail_response = client.get(f"/api/v1/communities/{GAME_ID}")

    assert list_response.status_code == 200
    assert detail_response.status_code == 200
    assert list_response.json()[0]["member_count"] == 1
    assert detail_response.json()["logo_url"] is None
    assert detail_response.json()["banner_url"] is None
    assert [table for table, _ in repository.queries] == [
        "community_directory",
        "community_directory",
    ]


def test_community_creation_requires_authentication(
    repository: FakeRepository,
) -> None:
    response = client.post("/api/v1/communities", json=valid_community_create())

    assert response.status_code == 401
    assert repository.queries == []


def test_cors_allows_community_creation_post() -> None:
    response = client.options(
        "/api/v1/communities",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type,idempotency-key",
        },
    )

    assert response.status_code == 200
    assert "POST" in response.headers["access-control-allow-methods"]


def test_authenticated_user_creates_community_with_verified_ownership(
    repository: FakeRepository,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )

    response = client.post(
        "/api/v1/communities",
        json=valid_community_create(),
        headers={"Idempotency-Key": IDEMPOTENCY_KEY},
    )

    assert response.status_code == 201
    assert response.json() == {
        "community_id": COMMUNITY_ID,
        "name": "Nexus Raiders",
        "game_id": GAME_ID,
        "region": "Global",
        "member_count": 1,
        "description": "A community for coordinated matches.",
        "logo_url": "https://images.example.com/logo.png",
        "banner_url": None,
    }
    assert repository.queries[-1] == (
        "communities:create",
        {
            "idempotency_key": IDEMPOTENCY_KEY,
            "fields": valid_community_create(),
        },
    )


@pytest.mark.parametrize(
    "field",
    ["owner_id", "role", "member_count", "community_id", "id"],
)
def test_community_creation_rejects_forbidden_client_fields(
    repository: FakeRepository,
    field: str,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )
    payload = valid_community_create()
    payload[field] = USER_ID

    response = client.post(
        "/api/v1/communities",
        json=payload,
        headers={"Idempotency-Key": IDEMPOTENCY_KEY},
    )

    assert response.status_code == 422
    assert not any(table == "communities:create" for table, _ in repository.queries)


def test_community_creation_rejects_unknown_game(
    repository: FakeRepository,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )
    payload = valid_community_create()
    payload["game_id"] = "00000000-0000-0000-0000-000000000099"

    response = client.post(
        "/api/v1/communities",
        json=payload,
        headers={"Idempotency-Key": IDEMPOTENCY_KEY},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "The selected game does not exist."
    assert not any(table == "communities:create" for table, _ in repository.queries)


def test_unexpected_community_database_errors_are_not_exposed(
    repository: FakeRepository,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )

    def fail_creation(
        fields: dict[str, object],
        idempotency_key: UUID,
    ) -> dict[str, object]:
        assert fields["name"] == "Nexus Raiders"
        assert idempotency_key == UUID(IDEMPOTENCY_KEY)
        raise RuntimeError("internal database endpoint detail")

    monkeypatch.setattr(repository, "create_community", fail_creation)
    safe_client = TestClient(app, raise_server_exceptions=False)

    response = safe_client.post(
        "/api/v1/communities",
        json=valid_community_create(),
        headers={"Idempotency-Key": IDEMPOTENCY_KEY},
    )

    assert response.status_code == 500
    assert "internal database endpoint detail" not in response.text


def test_community_creation_requires_an_idempotency_key(
    repository: FakeRepository,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )

    response = client.post("/api/v1/communities", json=valid_community_create())

    assert response.status_code == 422
    assert not any(table == "communities:create" for table, _ in repository.queries)


def test_community_creation_retry_returns_the_original_record(
    repository: FakeRepository,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )

    first = client.post(
        "/api/v1/communities",
        json=valid_community_create(),
        headers={"Idempotency-Key": IDEMPOTENCY_KEY},
    )
    retry = client.post(
        "/api/v1/communities",
        json=valid_community_create(),
        headers={"Idempotency-Key": IDEMPOTENCY_KEY},
    )

    assert first.status_code == retry.status_code == 201
    assert retry.json() == first.json()
    assert repository.community_creation_count == 1


def test_community_creation_rejects_reusing_key_with_different_payload(
    repository: FakeRepository,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )
    changed_payload = valid_community_create()
    changed_payload["name"] = "Different Raiders"

    first = client.post(
        "/api/v1/communities",
        json=valid_community_create(),
        headers={"Idempotency-Key": IDEMPOTENCY_KEY},
    )
    conflict = client.post(
        "/api/v1/communities",
        json=changed_payload,
        headers={"Idempotency-Key": IDEMPOTENCY_KEY},
    )

    assert first.status_code == 201
    assert conflict.status_code == 409
    assert conflict.json()["detail"] == (
        "This idempotency key was already used with different community details."
    )
    assert repository.community_creation_count == 1


def test_concurrent_duplicate_community_requests_create_once(
    repository: FakeRepository,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )

    def create():
        return client.post(
            "/api/v1/communities",
            json=valid_community_create(),
            headers={"Idempotency-Key": IDEMPOTENCY_KEY},
        )

    with ThreadPoolExecutor(max_workers=8) as executor:
        responses = list(executor.map(lambda _: create(), range(8)))

    assert all(response.status_code == 201 for response in responses)
    assert {response.json()["community_id"] for response in responses} == {
        COMMUNITY_ID,
    }
    assert repository.community_creation_count == 1


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


def test_current_profile_requires_authentication(repository: FakeRepository) -> None:
    response = client.get("/api/v1/profiles/me")

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
        "username": "test_player",
        "avatar_url": None,
        "bio": None,
        "favorite_games": ["Valorant"],
        "platform": "PC",
        "country": "Japan",
    }


def test_authenticated_user_can_read_current_profile(
    repository: FakeRepository,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )

    response = client.get("/api/v1/profiles/me")

    assert response.status_code == 200
    assert response.json()["user_id"] == USER_ID
    assert response.json()["username"] == "test_player"
    assert repository.queries[-1][1]["resource_id"] == USER_ID


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


def valid_profile_update() -> dict[str, object]:
    return {
        "display_name": "Updated Player",
        "username": "Updated_Player",
        "avatar_url": "https://images.example.com/avatar.png",
        "bio": "Ready to play.",
        "favorite_games": ["Valorant", "Apex Legends"],
        "platform": "PC",
        "country": "Japan",
    }


def test_authenticated_user_updates_only_their_current_profile(
    repository: FakeRepository,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )

    response = client.patch(
        "/api/v1/profiles/me",
        json=valid_profile_update(),
    )

    assert response.status_code == 200
    assert response.json() == {
        "user_id": USER_ID,
        "display_name": "Updated Player",
        "username": "updated_player",
        "avatar_url": "https://images.example.com/avatar.png",
        "bio": "Ready to play.",
        "favorite_games": ["Valorant", "Apex Legends"],
        "platform": "PC",
        "country": "Japan",
    }
    assert repository.queries[-1] == (
        "player_profiles:update",
        {
            "user_id": USER_ID,
            "fields": {
                "display_name": "Updated Player",
                "username": "updated_player",
                "avatar_url": "https://images.example.com/avatar.png",
                "bio": "Ready to play.",
                "favorite_games": ["Valorant", "Apex Legends"],
                "platform": "PC",
                "country": "Japan",
            },
        },
    )


def test_profile_update_rejects_client_supplied_user_id(
    repository: FakeRepository,
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )
    payload = valid_profile_update()
    payload["user_id"] = "00000000-0000-0000-0000-000000000003"

    response = client.patch("/api/v1/profiles/me", json=payload)

    assert response.status_code == 422
    assert repository.queries == []


@pytest.mark.parametrize(
    "changes",
    [
        {"display_name": "x"},
        {"username": "not a username"},
        {"avatar_url": "http://images.example.com/avatar.png"},
        {"avatar_url": "https://user:pass@images.example.com/avatar.png"},
        {"avatar_url": f"https://images.example.com/{'a' * 2050}"},
        {"bio": "x" * 281},
        {"favorite_games": ["Valorant"] * 21},
        {"country": "x" * 57},
        {"platform": "x" * 81},
    ],
)
def test_profile_update_rejects_invalid_fields(
    repository: FakeRepository,
    changes: dict[str, object],
) -> None:
    app.dependency_overrides[get_authenticated_repository] = lambda: (
        UUID(USER_ID),
        repository,
    )
    payload = valid_profile_update()
    payload.update(changes)

    response = client.patch("/api/v1/profiles/me", json=payload)

    assert response.status_code == 422
    assert repository.queries == []


def test_current_profile_update_requires_authentication(
    repository: FakeRepository,
) -> None:
    response = client.patch(
        "/api/v1/profiles/me",
        json=valid_profile_update(),
    )

    assert response.status_code == 401
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


def test_frontend_can_preflight_profile_updates() -> None:
    response = client.options(
        "/api/v1/profiles/me",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "PATCH",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "PATCH" in response.headers["access-control-allow-methods"]


def test_openapi_lists_resource_groups() -> None:
    response = client.get("/openapi.json")
    tags = {tag["name"] for tag in response.json()["tags"]}

    assert {"Users", "Profiles", "Games", "Communities", "Teams", "Tournaments", "Leaderboards"} <= tags
