from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "NEXUS NIDS"
    API_V1_STR: str = "/api/v1"
    
    # Database Settings with safe defaults
    POSTGRES_USER: str = "nexus_user"
    POSTGRES_PASSWORD: str = "nexus_password"
    POSTGRES_DB: str = "nexus_nids"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: str = "5432"
    
    # Security Settings
    SECRET_KEY: str = "nexus_nids_secret_key_super_secure_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Computed Database URL fallback
    DATABASE_URL: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Construct DATABASE_URL if not provided directly
if not settings.DATABASE_URL:
    settings.DATABASE_URL = (
        f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    )