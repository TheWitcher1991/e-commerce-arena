from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "E-Commerce Arena API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://arena:arena@127.0.0.1:5432/ecommerce_arena"
    jwt_secret_key: SecretStr
    access_token_minutes: int = 30
    participant_token_hours: int = 12
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value().encode("utf-8")) < 32:
            raise ValueError("JWT_SECRET_KEY must contain at least 32 bytes")
        return value

    @field_validator("access_token_minutes", "participant_token_hours")
    @classmethod
    def validate_token_lifetime(cls, value: int) -> int:
        if value < 1:
            raise ValueError("Token lifetime must be positive")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
