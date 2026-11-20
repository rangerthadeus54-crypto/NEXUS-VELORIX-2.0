import logging
from functools import lru_cache
from typing import Any
from uuid import UUID

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

    def create_community(
        self,
        fields: dict[str, Any],
        idempotency_key: UUID,
    ) -> dict[str, Any]:
        params = {
            "p_idempotency_key": str(idempotency_key),
            "p_name": fields["name"],
            "p_game_id": fields["game_id"],
            "p_region": fields["region"],
            "p_description": fields["description"],
            "p_logo_url": fields["logo_url"],
            "p_banner_url": fields["banner_url"],
        }
        try:
            response = self.client.rpc(
                "create_community_idempotently",
                params,
            ).execute()
        except APIError as error:
            if (
                error.code == "P0001"
                and error.message == "COMMUNITY_IDEMPOTENCY_CONFLICT"
            ):
                raise HTTPException(
                    status_code=409,
                    detail="This idempotency key was already used with different community details.",
                ) from error
            if error.code == "23503":
                raise HTTPException(
                    status_code=422,
                    detail="The selected game or account is no longer available.",
                ) from error
            if error.code == "23514":
                raise HTTPException(
                    status_code=422,
                    detail="One or more community fields are invalid.",
                ) from error
            if error.code == "42501":
                raise HTTPException(
                    status_code=403,
                    detail="You are not permitted to create this community.",
                ) from error
            logger.error("Supabase community creation RPC failed (code=%s)", error.code)
            raise HTTPException(
                status_code=502,
                detail="The Supabase data request failed.",
            ) from error
        except httpx.HTTPError as error:
            logger.error("Supabase community creation RPC failed during transport.")
            raise HTTPException(
                status_code=502,
                detail="The Supabase data request failed.",
            ) from error

        if (
            not isinstance(response.data, list)
            or len(response.data) != 1
            or not isinstance(response.data[0], dict)
            or not isinstance(response.data[0].get("community_id"), str)
        ):
            logger.error("Supabase returned an invalid community creation response")
            raise HTTPException(
                status_code=502,
                detail="The Supabase data response was invalid.",
            )

        community_id = response.data[0]["community_id"]
        community = self.get_row(
            "community_directory",
            community_id,
            columns=(
                "community_id:id,name,game_id,region,member_count,description,"
                "logo_url,banner_url"
            ),
        )
        if community is None:
            logger.error("Supabase returned no community after a successful insert")
            raise HTTPException(
                status_code=502,
                detail="The community was created but its response could not be retrieved.",
            )
        return community

    def update_player_profile(
        self,
        user_id: str,
        fields: dict[str, Any],
    ) -> dict[str, Any] | None:
        query = (
            self.client.table("player_profiles")
            .update(fields)
            .eq("id", user_id)
            .select(
                "user_id:id,display_name,username,avatar_url,bio,"
                "favorite_games,platform,country"
            )
        )
        try:
            response = query.execute()
        except APIError as error:
            if error.code == "23505":
                raise HTTPException(
                    status_code=409,
                    detail="That username is already in use.",
                ) from error
            logger.exception("Supabase update failed for player profile")
            raise HTTPException(
                status_code=502,
                detail="The Supabase data request failed.",
            ) from error
        except httpx.HTTPError as error:
            logger.exception("Supabase update failed for player profile")
            raise HTTPException(
                status_code=502,
                detail="The Supabase data request failed.",
            ) from error

        if not isinstance(response.data, list) or len(response.data) > 1:
            logger.error("Supabase returned an invalid player profile update response")
            raise HTTPException(
                status_code=502,
                detail="The Supabase data response was invalid.",
            )
        return response.data[0] if response.data else None
