"""
Application configuration loaded from environment variables.
Never hard-code secrets. All sensitive values come from env or secret management.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings from environment variables."""

    # Application
    APP_NAME: str = "AMS Operations & SLA Management System"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://ams:ams_dev_password@localhost:5432/ams_tracker",
        description="PostgreSQL connection string (async driver)",
    )

    @property
    def async_database_url(self) -> str:
        """Ensure the URL uses postgresql+asyncpg scheme for SQLAlchemy async engine."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # Authentication
    SECRET_KEY: str = Field(
        default="CHANGE-ME-IN-PRODUCTION-use-openssl-rand-hex-32",
        description="Secret key for JWT signing. MUST be changed in production.",
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Timezone
    DEFAULT_TIMEZONE: str = "Asia/Manila"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # Password policy
    MIN_PASSWORD_LENGTH: int = 8

    # Shift defaults
    DEFAULT_GRACE_PERIOD_MINUTES: int = 15

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
