from threading import Lock
from types import SimpleNamespace
from uuid import UUID

import httpx
from fastapi import HTTPException
from postgrest.exceptions import APIError
import pytest

from app.db.supabase import SupabaseRepository


class FakeQuery:
    def __init__(self, data: list[dict[str, object]] | None = None) -> None:
        self.data = data or []
        self.operations: list[tuple[object, ...]] = []
        self.error: Exception | None = None
        self.params: dict[str, object] = {}

    def select(self, columns: str) -> "FakeQuery":
        self.operations.append(("select", columns))
        return self

    def update(self, fields: dict[str, object]) -> "FakeQuery":
        self.operations.append(("update", fields))
        return self

    def insert(self, fields: dict[str, object]) -> "FakeQuery":
        self.operations.append(("insert", fields))
        return self

    def eq(self, column: str, value: str) -> "FakeQuery":
        self.operations.append(("eq", column, value))
        return self

    def ilike(self, column: str, value: str) -> "FakeQuery":
        self.operations.append(("ilike", column, value))
        return self

    def order(self, column: str, *, desc: bool) -> "FakeQuery":
        self.operations.append(("order", column, desc))
        return self

    def range(self, start: int, end: int) -> "FakeQuery":
        self.operations.append(("range", start, end))
        return self

    def execute(self) -> SimpleNamespace:
        if self.error:
            raise self.error
        return SimpleNamespace(data=self.data)


class FakeSupabaseClient:
    def __init__(
        self,
        query: FakeQuery | dict[str, FakeQuery],
        *,
        rpc_query: FakeQuery | None = None,
    ) -> None:
        self.query = query if isinstance(query, FakeQuery) else None
        self.queries = query if isinstance(query, dict) else {}
        self.rpc_query = rpc_query or self.query
        self.rpc_calls: list[tuple[str, dict[str, object]]] = []

    def table(self, name: str) -> FakeQuery:
        self.table_name = name
        if self.query is not None:
            return self.query
        return self.queries[name]

    def rpc(self, name: str, params: dict[str, object]) -> FakeQuery:
        self.rpc_calls.append((name, params))
        if self.rpc_query is None:
            raise AssertionError("An RPC query was not configured.")
        self.rpc_query.params = params
        return self.rpc_query


class FailFirstQuery(FakeQuery):
    def __init__(self, data: list[dict[str, object]]) -> None:
        super().__init__(data)
        self.attempts = 0

    def execute(self) -> SimpleNamespace:
        self.attempts += 1
        if self.attempts == 1:
            raise httpx.ConnectError("temporary read-back failure")
        return super().execute()


class IdempotentRpcQuery(FakeQuery):
    def __init__(self, community_id: str) -> None:
        super().__init__()
        self.community_id = community_id
        self.records: dict[str, dict[str, object]] = {}
        self.creation_count = 0
        self.lock = Lock()

    def execute(self) -> SimpleNamespace:
        params = self.params
        key = str(params["p_idempotency_key"])
        payload = {
            "name": params["p_name"],
            "game_id": params["p_game_id"],
            "region": params["p_region"],
            "description": params["p_description"],
            "logo_url": params["p_logo_url"],
            "banner_url": params["p_banner_url"],
        }
        with self.lock:
            existing = self.records.get(key)
            if existing is None:
                self.creation_count += 1
                self.records[key] = {"payload": payload, "id": self.community_id}
                existing = self.records[key]
            elif existing["payload"] != payload:
                raise APIError(
                    {
                        "code": "P0001",
                        "message": "COMMUNITY_IDEMPOTENCY_CONFLICT",
                    }
                )
            return SimpleNamespace(
                data=[{"community_id": existing["id"]}],
            )

def test_repository_applies_filters_order_and_page_window() -> None:
    query = FakeQuery([{"id": "game-id"}])
    repository = SupabaseRepository(FakeSupabaseClient(query))

    rows = repository.list_rows(
        "games",
        columns="id,name",
        filters={"genre": "FPS"},
        search=("name", "valorant"),
        order_by="name",
        descending=True,
        limit=10,
        offset=20,
    )

    assert rows == [{"id": "game-id"}]
    assert query.operations == [
        ("select", "id,name"),
        ("eq", "genre", "FPS"),
        ("ilike", "name", "%valorant%"),
        ("order", "name", True),
        ("range", 20, 29),
    ]


def test_repository_maps_transport_errors_to_gateway_error() -> None:
    query = FakeQuery()
    query.error = httpx.ConnectError("connection unavailable")
    repository = SupabaseRepository(FakeSupabaseClient(query))

    with pytest.raises(HTTPException) as error:
        repository.list_rows("games")

    assert error.value.status_code == 502
    assert error.value.detail == "The Supabase data request failed."


def test_repository_updates_profile_by_authenticated_user_id() -> None:
    fields = {
        "display_name": "Updated Player",
        "username": "updated_player",
        "avatar_url": "https://images.example.com/avatar.png",
        "bio": "Ready to play.",
    }
    query = FakeQuery([{"id": "user-id", **fields}])
    repository = SupabaseRepository(FakeSupabaseClient(query))

    profile = repository.update_player_profile("user-id", fields)

    assert profile == {"id": "user-id", **fields}
    assert query.operations == [
        ("update", fields),
        ("eq", "id", "user-id"),
        (
            "select",
            "user_id:id,display_name,username,avatar_url,bio,"
            "favorite_games,platform,country",
        ),
    ]


def test_repository_calls_idempotent_creation_rpc_and_reads_community() -> None:
    community_id = "00000000-0000-0000-0000-000000000003"
    idempotency_key = UUID("00000000-0000-0000-0000-000000000004")
    fields = {
        "name": "Nexus Raiders",
        "game_id": "00000000-0000-0000-0000-000000000002",
        "region": "Global",
        "description": "A community for coordinated matches.",
        "logo_url": "https://images.example.com/logo.png",
        "banner_url": None,
    }
    rpc_query = FakeQuery([{"community_id": community_id}])
    directory_query = FakeQuery(
        [
            {
                "id": community_id,
                "community_id": community_id,
                "name": fields["name"],
                "game_id": fields["game_id"],
                "region": fields["region"],
                "member_count": 1,
                "description": fields["description"],
                "logo_url": fields["logo_url"],
                "banner_url": fields["banner_url"],
            }
        ]
    )
    repository = SupabaseRepository(
        FakeSupabaseClient(
            {
                "community_directory": directory_query,
            },
            rpc_query=rpc_query,
        )
    )

    community = repository.create_community(fields, idempotency_key)

    assert community["community_id"] == community_id
    assert repository.client.rpc_calls == [
        (
            "create_community_idempotently",
            {
                "p_idempotency_key": str(idempotency_key),
                "p_name": fields["name"],
                "p_game_id": fields["game_id"],
                "p_region": fields["region"],
                "p_description": fields["description"],
                "p_logo_url": fields["logo_url"],
                "p_banner_url": fields["banner_url"],
            },
        )
    ]
    assert directory_query.operations == [
        (
            "select",
            (
                "community_id:id,name,game_id,region,member_count,description,"
                "logo_url,banner_url"
            ),
        ),
        ("eq", "id", community_id),
        ("range", 0, 0),
    ]


def test_repository_recovers_after_community_read_back_failure() -> None:
    community_id = "00000000-0000-0000-0000-000000000003"
    idempotency_key = UUID("00000000-0000-0000-0000-000000000004")
    fields = {
        "name": "Nexus Raiders",
        "game_id": "00000000-0000-0000-0000-000000000002",
        "region": "Global",
        "description": "A community for coordinated matches.",
        "logo_url": None,
        "banner_url": None,
    }
    rpc_query = IdempotentRpcQuery(community_id)
    directory_query = FailFirstQuery(
        [
            {
                "id": community_id,
                "community_id": community_id,
                **fields,
                "member_count": 1,
            }
        ]
    )
    client = FakeSupabaseClient(
        {"community_directory": directory_query},
        rpc_query=rpc_query,
    )
    repository = SupabaseRepository(client)

    with pytest.raises(HTTPException) as first_error:
        repository.create_community(fields, idempotency_key)
    recovered = repository.create_community(fields, idempotency_key)

    assert first_error.value.status_code == 502
    assert recovered["community_id"] == community_id
    assert rpc_query.creation_count == 1
    assert client.rpc_calls[0] == client.rpc_calls[1]


def test_repository_maps_community_database_failures_to_safe_errors() -> None:
    query = FakeQuery()
    query.error = httpx.ConnectError("sensitive database endpoint detail")
    repository = SupabaseRepository(
        FakeSupabaseClient(FakeQuery(), rpc_query=query)
    )

    with pytest.raises(HTTPException) as error:
        repository.create_community(
            {
                "name": "Nexus Raiders",
                "game_id": "game-id",
                "region": "Global",
                "description": "A community for coordinated matches.",
                "logo_url": None,
                "banner_url": None,
            },
            UUID("00000000-0000-0000-0000-000000000004"),
        )

    assert error.value.status_code == 502
    assert error.value.detail == "The Supabase data request failed."
    assert "sensitive" not in error.value.detail


@pytest.mark.parametrize(
    ("code", "status_code", "detail"),
    [
        ("23503", 422, "The selected game or account is no longer available."),
        ("23514", 422, "One or more community fields are invalid."),
        ("42501", 403, "You are not permitted to create this community."),
        ("P0001", 502, "The Supabase data request failed."),
        ("XX000", 502, "The Supabase data request failed."),
    ],
)
def test_repository_maps_postgrest_community_errors_safely(
    code: str,
    status_code: int,
    detail: str,
) -> None:
    query = FakeQuery()
    query.error = APIError(
        {
            "code": code,
            "message": "sensitive database detail",
            "details": "private constraint information",
        }
    )
    repository = SupabaseRepository(
        FakeSupabaseClient(FakeQuery(), rpc_query=query)
    )

    with pytest.raises(HTTPException) as error:
        repository.create_community(
            {
                "name": "Nexus Raiders",
                "game_id": "game-id",
                "region": "Global",
                "description": "A community for coordinated matches.",
                "logo_url": None,
                "banner_url": None,
            },
            UUID("00000000-0000-0000-0000-000000000004"),
        )

    assert error.value.status_code == status_code
    assert error.value.detail == detail
    assert "sensitive" not in error.value.detail
    assert "private constraint" not in error.value.detail


def test_repository_maps_idempotency_payload_conflict_to_safe_client_error() -> None:
    query = FakeQuery()
    query.error = APIError(
        {
            "code": "P0001",
            "message": "COMMUNITY_IDEMPOTENCY_CONFLICT",
            "details": "private request payload",
        }
    )
    repository = SupabaseRepository(
        FakeSupabaseClient(FakeQuery(), rpc_query=query)
    )

    with pytest.raises(HTTPException) as error:
        repository.create_community(
            {
                "name": "Nexus Raiders",
                "game_id": "game-id",
                "region": "Global",
                "description": "A community for coordinated matches.",
                "logo_url": None,
                "banner_url": None,
            },
            UUID("00000000-0000-0000-0000-000000000004"),
        )

    assert error.value.status_code == 409
    assert error.value.detail == (
        "This idempotency key was already used with different community details."
    )
    assert "private" not in error.value.detail
