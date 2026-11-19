from pathlib import Path
from urllib.parse import urlparse

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    title: str = "NEXUS VELORIX API"
    version: str = "0.1.0"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5187",
        "http://127.0.0.1:5187",
    ]
    supabase_url: str | None = Field(default=None, validation_alias="SUPABASE_URL")
    supabase_anon_key: SecretStr | None = Field(
        default=None,
        validation_alias="SUPABASE_ANON_KEY",
    )

    model_config = SettingsConfigDict(
        env_prefix="API_",
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("supabase_url", mode="before")
    @classmethod
    def normalize_empty_url(cls, value: str | None) -> str | None:
        return value.strip() or None if isinstance(value, str) else value

    @field_validator("supabase_anon_key", mode="before")
    @classmethod
    def normalize_empty_anon_key(cls, value: str | None) -> str | None:
        return value.strip() or None if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_supabase_configuration(self) -> "Settings":
        if bool(self.supabase_url) != bool(self.supabase_anon_key):
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be configured together.")
        if self.supabase_url:
            parsed_url = urlparse(self.supabase_url)
            if parsed_url.scheme != "https" and not (
                parsed_url.scheme == "http"
                and parsed_url.hostname in {"localhost", "127.0.0.1"}
            ):
                raise ValueError("SUPABASE_URL must use HTTPS except for local development.")
        return self

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key)


settings = Settings()
