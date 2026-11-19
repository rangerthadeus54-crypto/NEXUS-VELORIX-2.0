from typing import Annotated
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client
from supabase_auth.errors import AuthApiError, AuthError

from app.core.config import settings
from app.db.supabase import SupabaseRepository, get_supabase_client

bearer_scheme = HTTPBearer(auto_error=False)


def get_repository() -> SupabaseRepository:
    return SupabaseRepository(get_supabase_client())


def get_authenticated_repository(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> tuple[UUID, SupabaseRepository]:
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured.",
        )

    client = create_client(
        settings.supabase_url,
        settings.supabase_anon_key.get_secret_value(),
    )
    try:
        auth_user = client.auth.get_user(credentials.credentials)
    except AuthApiError as error:
        if error.status in {401, 403, 404}:
            raise HTTPException(
                status_code=401,
                detail="The bearer token is invalid or expired.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from error
        raise HTTPException(
            status_code=503,
            detail="Supabase authentication is temporarily unavailable.",
        ) from error
    except (AuthError, httpx.HTTPError) as error:
        raise HTTPException(
            status_code=503,
            detail="Supabase authentication is temporarily unavailable.",
        ) from error

    if auth_user is None:
        raise HTTPException(
            status_code=401,
            detail="The bearer token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    client.postgrest.auth(credentials.credentials)
    return UUID(auth_user.user.id), SupabaseRepository(client)
