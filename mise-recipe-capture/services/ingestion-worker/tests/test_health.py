from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient
from pydantic import SecretStr

from recipe_worker.app import create_app
from recipe_worker.config import WorkerSettings


def ready_settings(temp_root: Path) -> WorkerSettings:
    temp_root.mkdir()
    return WorkerSettings(
        _env_file=None,
        environment="test",
        worker_mode="fixture",
        worker_id="test-worker",
        worker_shared_secret=SecretStr("test-only-shared-secret"),
        supabase_url="http://127.0.0.1:54321",
        supabase_service_role_key=SecretStr("test-only-service-role"),
        temp_root=temp_root,
        fixture_mode_enabled=True,
    )


def test_liveness_and_fixture_readiness(tmp_path: Path) -> None:
    with TestClient(create_app(ready_settings(tmp_path / "temp"))) as client:
        assert client.get("/health/live").json() == {"status": "live"}
        response = client.get("/health/ready")
        assert response.status_code == 200
        assert response.json() == {"status": "ready"}


def test_readiness_reports_missing_configuration_without_secrets(
    tmp_path: Path,
) -> None:
    root = tmp_path / "temp"
    root.mkdir()
    settings = WorkerSettings(
        _env_file=None,
        environment="test",
        worker_mode="fixture",
        temp_root=root,
        worker_shared_secret=None,
        supabase_url=None,
        supabase_service_role_key=None,
    )
    with TestClient(create_app(settings)) as client:
        response = client.get("/health/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "not_ready"
    assert "SUPABASE_URL is not configured" in body["issues"]
    assert "SUPABASE_SERVICE_ROLE_KEY is not configured" in body["issues"]
    assert "test-only" not in response.text


def test_live_mode_is_not_ready_while_acquisition_is_a_skeleton(
    tmp_path: Path,
) -> None:
    settings = ready_settings(tmp_path / "temp").model_copy(
        update={"worker_mode": "live"}
    )
    with TestClient(create_app(settings)) as client:
        response = client.get("/health/ready")

    assert response.status_code == 503
    assert "live platform acquisition is not configured" in response.json()["issues"]
