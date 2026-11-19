from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.dependencies import get_authenticated_repository, get_repository
from app.db.supabase import SupabaseRepository
from app.schemas import (
    CommunitySummary,
    GameSummary,
    LeaderboardEntry,
    PlayerProfile,
    TeamSummary,
    TournamentSummary,
    UserSummary,
)

router = APIRouter()
RepositoryDependency = Annotated[SupabaseRepository, Depends(get_repository)]
AuthenticatedRepositoryDependency = Annotated[
    tuple[UUID, SupabaseRepository],
    Depends(get_authenticated_repository),
]


def not_found(resource: str, resource_id: UUID) -> HTTPException:
    return HTTPException(
        status_code=404,
        detail=f"{resource} '{resource_id}' was not found.",
    )


@router.get(
    "/users",
    response_model=list[UserSummary],
    tags=["Users"],
    summary="List users",
)
def list_users(
    repository: RepositoryDependency,
    country: Annotated[str | None, Query(min_length=2, max_length=56)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0, le=10000)] = 0,
) -> list[UserSummary]:
    if country is not None:
        raise HTTPException(
            status_code=422,
            detail="Country filtering is unavailable while country remains private.",
        )

    return repository.list_rows(
        "player_directory",
        columns="user_id:id,display_name",
        order_by="display_name",
        limit=limit,
        offset=offset,
    )


@router.get(
    "/users/{user_id}",
    response_model=UserSummary,
    tags=["Users"],
    summary="Get a user",
)
def get_user(user_id: UUID, repository: RepositoryDependency) -> UserSummary:
    user = repository.get_row(
        "player_directory",
        str(user_id),
        columns="user_id:id,display_name",
    )
    if user is None:
        raise not_found("User", user_id)
    return user


@router.get(
    "/profiles/{user_id}",
    response_model=PlayerProfile,
    tags=["Profiles"],
    summary="Get a player profile",
)
def get_profile(
    user_id: UUID,
    authenticated_repository: AuthenticatedRepositoryDependency,
) -> PlayerProfile:
    authenticated_user_id, repository = authenticated_repository
    if authenticated_user_id != user_id:
        raise not_found("Profile", user_id)

    profile = repository.get_row(
        "player_profiles",
        str(user_id),
        columns="user_id:id,display_name,favorite_games,platform,country",
    )
    if profile is None:
        raise not_found("Profile", user_id)
    return profile


@router.get(
    "/games",
    response_model=list[GameSummary],
    tags=["Games"],
    summary="List games",
)
def list_games(
    repository: RepositoryDependency,
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0, le=10000)] = 0,
) -> list[GameSummary]:
    return repository.list_rows(
        "games",
        columns="game_id:id,slug,name,genre",
        search=("name", q) if q else None,
        order_by="name",
        limit=limit,
        offset=offset,
    )


@router.get(
    "/games/{game_id}",
    response_model=GameSummary,
    tags=["Games"],
    summary="Get a game",
)
def get_game(game_id: UUID, repository: RepositoryDependency) -> GameSummary:
    game = repository.get_row(
        "games",
        str(game_id),
        columns="game_id:id,slug,name,genre",
    )
    if game is None:
        raise not_found("Game", game_id)
    return game


@router.get(
    "/communities",
    response_model=list[CommunitySummary],
    tags=["Communities"],
    summary="List communities",
)
def list_communities(
    repository: RepositoryDependency,
    game_id: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0, le=10000)] = 0,
) -> list[CommunitySummary]:
    filters = {"game_id": str(game_id)} if game_id else None
    return repository.list_rows(
        "community_directory",
        columns="community_id:id,name,game_id,region,member_count,description",
        filters=filters,
        order_by="name",
        limit=limit,
        offset=offset,
    )


@router.get(
    "/communities/{community_id}",
    response_model=CommunitySummary,
    tags=["Communities"],
    summary="Get a community",
)
def get_community(
    community_id: UUID,
    repository: RepositoryDependency,
) -> CommunitySummary:
    community = repository.get_row(
        "community_directory",
        str(community_id),
        columns="community_id:id,name,game_id,region,member_count,description",
    )
    if community is None:
        raise not_found("Community", community_id)
    return community


@router.get(
    "/teams",
    response_model=list[TeamSummary],
    tags=["Teams"],
    summary="List teams",
)
def list_teams(
    repository: RepositoryDependency,
    game_id: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0, le=10000)] = 0,
) -> list[TeamSummary]:
    filters = {"game_id": str(game_id)} if game_id else None
    return repository.list_rows(
        "team_directory",
        columns="team_id:id,name,game_id,region,member_count",
        filters=filters,
        order_by="name",
        limit=limit,
        offset=offset,
    )


@router.get(
    "/teams/{team_id}",
    response_model=TeamSummary,
    tags=["Teams"],
    summary="Get a team",
)
def get_team(team_id: UUID, repository: RepositoryDependency) -> TeamSummary:
    team = repository.get_row(
        "team_directory",
        str(team_id),
        columns="team_id:id,name,game_id,region,member_count",
    )
    if team is None:
        raise not_found("Team", team_id)
    return team


@router.get(
    "/tournaments",
    response_model=list[TournamentSummary],
    tags=["Tournaments"],
    summary="List tournaments",
)
def list_tournaments(
    repository: RepositoryDependency,
    game_id: UUID | None = None,
    status: Literal["upcoming", "registration_open", "in_progress", "completed"] | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0, le=10000)] = 0,
) -> list[TournamentSummary]:
    filters = {}
    if game_id:
        filters["game_id"] = str(game_id)
    if status:
        filters["status"] = status
    return repository.list_rows(
        "tournaments",
        columns="tournament_id:id,name,game_id,starts_at,status",
        filters=filters or None,
        order_by="starts_at",
        limit=limit,
        offset=offset,
    )


@router.get(
    "/tournaments/{tournament_id}",
    response_model=TournamentSummary,
    tags=["Tournaments"],
    summary="Get a tournament",
)
def get_tournament(
    tournament_id: UUID,
    repository: RepositoryDependency,
) -> TournamentSummary:
    tournament = repository.get_row(
        "tournaments",
        str(tournament_id),
        columns="tournament_id:id,name,game_id,starts_at,status",
    )
    if tournament is None:
        raise not_found("Tournament", tournament_id)
    return tournament


@router.get(
    "/leaderboards",
    response_model=list[LeaderboardEntry],
    tags=["Leaderboards"],
    summary="List leaderboard entries",
)
def list_leaderboard(
    repository: RepositoryDependency,
    scope: Literal["global", "country"] = "global",
    game_id: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0, le=10000)] = 0,
) -> list[LeaderboardEntry]:
    if scope == "country":
        raise HTTPException(
            status_code=422,
            detail="Country leaderboards are unavailable until players can opt in to sharing their country.",
        )

    filters = {}
    if game_id:
        filters["game_id"] = str(game_id)
    rows = repository.list_rows(
        "leaderboard_entries",
        filters=filters or None,
        order_by="score",
        descending=True,
        limit=limit,
        offset=offset,
    )
    return [
        LeaderboardEntry(rank=offset + index + 1, **row)
        for index, row in enumerate(rows)
    ]
