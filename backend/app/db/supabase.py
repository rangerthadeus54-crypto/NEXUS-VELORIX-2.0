import logging
from functools import lru_cache
from typing import Any

import httpx
from fastapi import HTTPException
from postgrest.exceptions import APIError
from supabase import Client, create_client

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    supabase_url = settings.supabase_url
    anon_key = settings.supabase_anon_key
    if not supabase_url or not anon_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
        )
    return create_client(supabase_url, anon_key.get_secret_value())


class SupabaseRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def list_rows(
        self,
        table: str,
        *,
        columns: str = "*",
        filters: dict[str, str] | None = None,
        search: tuple[str, str] | None = None,
        order_by: str | None = None,
        descending: bool = False,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        query = self.client.table(table).select(columns)
        for column, value in (filters or {}).items():
            query = query.eq(column, value)
        if search:
            column, value = search
            query = query.ilike(column, f"%{value}%")
        if order_by:
            query = query.order(order_by, desc=descending)
        try:
            response = query.range(offset, offset + limit - 1).execute()
        except (APIError, httpx.HTTPError) as error:
            logger.exception("Supabase read failed for resource %s", table)
            raise HTTPException(
                status_code=502,
                detail="The Supabase data request failed.",
            ) from error
        if not isinstance(response.data, list):
            logger.error("Supabase returned a non-list response for resource %s", table)
            raise HTTPException(
                status_code=502,
                detail="The Supabase data response was invalid.",
            )
        return response.data

    def get_row(
        self,
        table: str,
        resource_id: str,
        *,
        id_column: str = "id",
        columns: str = "*",
    ) -> dict[str, Any] | None:
        rows = self.list_rows(
            table,
            columns=columns,
            filters={id_column: resource_id},
            limit=1,
        )
        return rows[0] if rows else None
