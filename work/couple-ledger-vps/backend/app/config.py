from __future__ import annotations

import os
import secrets
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _persistent_jwt_secret() -> str:
    """Return a stable JWT secret.

    Priority: JWT_SECRET env var -> persisted secret file -> generate once and persist.
    Without this, a random per-process secret logs every user out on each restart/deploy.
    """
    env_secret = os.environ.get("JWT_SECRET", "").strip()
    if env_secret:
        return env_secret

    secret_path = Path(
        os.environ.get(
            "JWT_SECRET_FILE",
            str(Path(__file__).resolve().parent.parent / "data" / ".jwt_secret"),
        )
    )
    try:
        if secret_path.exists():
            existing = secret_path.read_text(encoding="utf-8").strip()
            if existing:
                return existing
        secret_path.parent.mkdir(parents=True, exist_ok=True)
        generated = secrets.token_hex(32)
        secret_path.write_text(generated, encoding="utf-8")
        try:
            os.chmod(secret_path, 0o600)
        except OSError:
            pass
        return generated
    except OSError:
        # Last resort: ephemeral secret (still works within a single process lifetime).
        return secrets.token_hex(32)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    jwt_secret: str = _persistent_jwt_secret()
    jwt_alg: str = "HS256"
    jwt_expire_hours: int = 72
    jwt_refresh_days: int = 30

    # Local timezone offset (hours) used for "today"-style calculations such as
    # streaks and recurring-bill due dates. Defaults to China Standard Time (+8).
    tz_offset_hours: int = 8

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    app_base_url: str = "http://162.243.80.127:8080"

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"

    db_path: str = os.environ.get(
        "DB_PATH",
        str(Path(__file__).resolve().parent.parent / "data" / "ledger.db"),
    )
    host: str = "127.0.0.1"
    port: int = 8788

    admin_emails: str = ""
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://162.243.80.127:8080,https://couplespace.ai,https://www.couplespace.ai"
    rate_limit_per_minute: int = 120

    dev_mode: bool = False
    api_version: str = "2.2.0-beta"
    min_android_version: str = "1.0.0"
    min_android_build: int = 100


settings = Settings()


def admin_email_set() -> set[str]:
    return {e.strip().lower() for e in settings.admin_emails.split(",") if e.strip()}


def cors_origin_list() -> list[str]:
    return [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
