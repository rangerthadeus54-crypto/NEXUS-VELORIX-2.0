from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]
    api_version: str
    data_backend: Literal["not_configured", "configured"]


class UserSummary(BaseModel):
    user_id: UUID
    display_name: str


class PlayerProfile(BaseModel):
    user_id: UUID
    display_name: str
    favorite_games: list[str] = Field(default_factory=list)
    platform: str | None = None
    country: str | None = None


class GameSummary(BaseModel):
    game_id: UUID
    slug: str
    name: str
    genre: str | None = None


class CommunitySummary(BaseModel):
    community_id: UUID
    name: str
    game_id: UUID
    region: str
    member_count: int = Field(ge=0)
    description: str | None = None


class TeamSummary(BaseModel):
    team_id: UUID
    name: str
    game_id: UUID
    region: str
    member_count: int = Field(ge=0)


class TournamentSummary(BaseModel):
    tournament_id: UUID
    name: str
    game_id: UUID
    starts_at: datetime
    status: Literal["upcoming", "registration_open", "in_progress", "completed"]


class LeaderboardEntry(BaseModel):
    rank: int = Field(ge=1)
    user_id: UUID
    game_id: UUID
    score: float = Field(ge=0)
