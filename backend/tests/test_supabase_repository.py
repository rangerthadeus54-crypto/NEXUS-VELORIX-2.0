from types import SimpleNamespace

import httpx
from fastapi import HTTPException
import pytest

from app.db.supabase import SupabaseRepository


class FakeQuery:
    def __init__(self, data: list[dict[str, object]] | None = None) -> None:
        self.data = data or []
        self.operations: list[tuple[object, ...]] = []
        self.error: Exception | None = None

    def select(self, columns: str) -> "FakeQuery":
        self.operations.append(("select", columns))
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
    def __init__(self, query: FakeQuery) -> None:
        self.query = query

    def table(self, name: str) -> FakeQuery:
        self.table_name = name
        return self.query


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
