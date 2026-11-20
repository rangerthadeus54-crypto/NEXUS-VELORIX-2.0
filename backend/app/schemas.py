from datetime import datetime
from typing import Literal
from urllib.parse import urlparse
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


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
    username: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    favorite_games: list[str] = Field(default_factory=list)
    platform: str | None = None
    country: str | None = None


class PlayerProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(min_length=2, max_length=80)
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=24,
        pattern=r"^[a-z0-9_]+$",
    )
    avatar_url: HttpUrl | None = None
    bio: str | None = Field(default=None, max_length=280)
    favorite_games: list[str] = Field(default_factory=list, max_length=20)
    platform: str | None = Field(default=None, max_length=80)
    country: str | None = Field(default=None, max_length=56)

    @field_validator("display_name", mode="before")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: str | None) -> str | None:
        if not isinstance(value, str):
            return value
        username = value.strip().lower()
        return username or None

    @field_validator("bio", "platform", "country", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if not isinstance(value, str):
            return value
        text = value.strip()
        return text or None

    @field_validator("avatar_url", mode="before")
    @classmethod
    def normalize_avatar_url(cls, value: str | None) -> str | None:
        if not isinstance(value, str):
            return value
        url = value.strip()
        return url or None

    @field_validator("avatar_url")
    @classmethod
    def require_secure_avatar_url(cls, value: HttpUrl | None) -> HttpUrl | None:
        if value is not None:
            parsed_url = urlparse(str(value))
            if value.scheme != "https":
                raise ValueError("Avatar URLs must use HTTPS.")
            if parsed_url.username or parsed_url.password:
                raise ValueError("Avatar URLs must not contain credentials.")
            if len(str(value)) > 2048:
                raise ValueError("Avatar URLs must not exceed 2048 characters.")
        return value

    @field_validator("favorite_games")
    @classmethod
    def normalize_favorite_games(cls, games: list[str]) -> list[str]:
        normalized = [game.strip() for game in games]
        if any(not game or len(game) > 120 for game in normalized):
            raise ValueError("Favorite game names must contain 1 to 120 characters.")
        if len(set(normalized)) != len(normalized):
            raise ValueError("Favorite games must not contain duplicates.")
        return normalized


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
    logo_url: HttpUrl | None = None
    banner_url: HttpUrl | None = None


class CommunityCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=3, max_length=120)
    game_id: UUID
    region: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=20, max_length=500)
    logo_url: HttpUrl | None = None
    banner_url: HttpUrl | None = None

    @field_validator("name", "region", "description", mode="before")
    @classmethod
    def normalize_required_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("logo_url", "banner_url", mode="before")
    @classmethod
    def normalize_image_url(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        url = value.strip()
        return url or None

    @field_validator("logo_url", "banner_url")
    @classmethod
    def require_secure_image_url(cls, value: HttpUrl | None) -> HttpUrl | None:
        if value is not None:
            parsed_url = urlparse(str(value))
            if value.scheme != "https":
                raise ValueError("Community image URLs must use HTTPS.")
            if parsed_url.username or parsed_url.password:
                raise ValueError("Community image URLs must not contain credentials.")
            if len(str(value)) > 2048:
                raise ValueError("Community image URLs must not exceed 2048 characters.")
        return value


class CommunityCreateResponse(CommunitySummary):
    model_config = ConfigDict(extra="forbid")


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
