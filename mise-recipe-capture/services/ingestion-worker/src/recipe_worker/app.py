from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .config import WorkerSettings
from .workspace import WorkspaceManager


def create_app(settings: WorkerSettings | None = None) -> FastAPI:
    configured = settings or WorkerSettings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        manager = WorkspaceManager(
            configured.temp_root,
            raw_media_ttl=timedelta(hours=configured.raw_media_ttl_hours),
            disk_limit_bytes=configured.temp_disk_limit_bytes,
        )
        manager.cleanup_expired()
        application.state.settings = configured
        application.state.workspaces = manager
        yield

    application = FastAPI(
        title="Mise ingestion worker",
        version="0.1.0",
        docs_url=None if configured.environment == "production" else "/docs",
        redoc_url=None,
        lifespan=lifespan,
    )

    @application.get("/health/live", include_in_schema=False)
    async def health_live() -> dict[str, str]:
        return {"status": "live"}

    @application.get("/health/ready", include_in_schema=False)
    async def health_ready(request: Request) -> JSONResponse:
        active_settings: WorkerSettings = request.app.state.settings
        issues = active_settings.readiness_issues()
        if issues:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "issues": list(issues)},
            )
        return JSONResponse(status_code=200, content={"status": "ready"})

    return application


app = create_app()
