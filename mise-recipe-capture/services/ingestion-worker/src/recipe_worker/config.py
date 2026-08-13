from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path
from typing import Literal

from pydantic import AnyHttpUrl, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: Literal["development", "test", "staging", "production"] = (
        "development"
    )
    worker_mode: Literal["fixture", "live"] = "fixture"
    worker_id: str = Field(default="local-worker", min_length=1, max_length=200)
    worker_shared_secret: SecretStr | None = None

    supabase_url: AnyHttpUrl | None = None
    supabase_service_role_key: SecretStr | None = None

    temp_root: Path = Path(tempfile.gettempdir()) / "mise-ingestion"
    temp_disk_limit_gb: float = Field(default=5.0, gt=0, le=1_024)
    raw_media_ttl_hours: float = Field(default=24.0, gt=0, le=24)
    review_proxy_ttl_hours: float = Field(default=24.0, gt=0, le=24)
    job_timeout_seconds: int = Field(default=3_600, ge=30, le=86_400)
    max_redirects: int = Field(default=5, ge=0, le=10)
    max_download_bytes: int = Field(
        default=500 * 1_024 * 1_024,
        ge=1_024,
        le=2 * 1_024 * 1_024 * 1_024,
    )

    asr_provider: str = "not-configured"
    asr_api_key: SecretStr | None = None
    ocr_provider: str = "not-configured"
    ocr_api_key: SecretStr | None = None
    extraction_provider: str = "not-configured"
    extraction_api_key: SecretStr | None = None
    translation_provider: str = "not-configured"
    translation_api_key: SecretStr | None = None

    platform_cookie_file_path: Path | None = None
    http_proxy: AnyHttpUrl | None = None
    https_proxy: AnyHttpUrl | None = None
    fixture_mode_enabled: bool = True

    @field_validator(
        "worker_shared_secret",
        "supabase_service_role_key",
        "asr_api_key",
        "ocr_api_key",
        "extraction_api_key",
        "translation_api_key",
        mode="before",
    )
    @classmethod
    def empty_secret_is_none(cls, value: object) -> object:
        return None if value == "" else value

    @property
    def temp_disk_limit_bytes(self) -> int:
        return int(self.temp_disk_limit_gb * 1_024 * 1_024 * 1_024)

    def readiness_issues(self) -> tuple[str, ...]:
        issues: list[str] = []
        if self.supabase_url is None:
            issues.append("SUPABASE_URL is not configured")
        if not self._has_secret(self.supabase_service_role_key):
            issues.append("SUPABASE_SERVICE_ROLE_KEY is not configured")
        if not self._has_secret(self.worker_shared_secret):
            issues.append("WORKER_SHARED_SECRET is not configured")

        if not self.temp_root.exists() or not self.temp_root.is_dir():
            issues.append("TEMP_ROOT does not exist")
        elif not os.access(self.temp_root, os.R_OK | os.W_OK | os.X_OK):
            issues.append("TEMP_ROOT is not readable and writable")

        if self.worker_mode == "fixture":
            if not self.fixture_mode_enabled:
                issues.append("fixture mode is disabled")
        else:
            # Live adapters deliberately raise until a compliant acquisition
            # backend is implemented and configured.
            issues.append("live platform acquisition is not configured")
            if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
                issues.append("ffmpeg and ffprobe are required for live mode")
            self._check_provider(
                issues, "ASR", self.asr_provider, self.asr_api_key
            )
            self._check_provider(
                issues, "OCR", self.ocr_provider, self.ocr_api_key
            )
            self._check_provider(
                issues,
                "EXTRACTION",
                self.extraction_provider,
                self.extraction_api_key,
            )
            self._check_provider(
                issues,
                "TRANSLATION",
                self.translation_provider,
                self.translation_api_key,
            )
        return tuple(issues)

    @staticmethod
    def _has_secret(value: SecretStr | None) -> bool:
        return value is not None and bool(value.get_secret_value())

    @classmethod
    def _check_provider(
        cls,
        issues: list[str],
        capability: str,
        provider: str,
        api_key: SecretStr | None,
    ) -> None:
        if provider.strip().lower() in {"", "none", "not-configured"}:
            issues.append(f"{capability}_PROVIDER is not configured")
        if not cls._has_secret(api_key):
            issues.append(f"{capability}_API_KEY is not configured")
