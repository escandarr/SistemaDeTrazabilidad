from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    # Orígenes permitidos para CORS, separados por coma (dominios del frontend).
    cors_origins: str = "http://localhost:5173"

    @field_validator("database_url")
    @classmethod
    def _forzar_driver_async(cls, v: str) -> str:
        # Railway/Render entregan la URL como postgresql:// (o postgres://).
        # El backend usa el driver asíncrono asyncpg.
        if v.startswith("postgresql+asyncpg://"):
            return v
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
