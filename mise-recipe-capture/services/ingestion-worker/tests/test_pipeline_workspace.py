from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID

import pytest

from recipe_worker.errors import (
    InvalidStageTransitionError,
    JobCancelledError,
    PlatformAcquisitionNotConfiguredError,
)
from recipe_worker.models import ImportJob, JobStage
from recipe_worker.pipeline import (
    IngestionPipeline,
    InMemoryJobReporter,
    PipelineStateMachine,
)
from recipe_worker.workspace import WorkspaceManager

JOB_ID = UUID("30000000-0000-4000-8000-000000000001")
OWNER_ID = UUID("30000000-0000-4000-8000-000000000002")


def manager(root: Path) -> WorkspaceManager:
    return WorkspaceManager(
        root,
        raw_media_ttl=timedelta(hours=24),
        disk_limit_bytes=10 * 1_024 * 1_024,
    )


def test_state_machine_allows_forward_and_failure_not_backward() -> None:
    state = PipelineStateMachine(JobStage.QUEUED)
    state.transition(JobStage.RESOLVING_SOURCE)
    assert state.can_transition(JobStage.FAILED)
    with pytest.raises(InvalidStageTransitionError):
        state.transition(JobStage.QUEUED)


def test_workspace_is_removed_even_when_processing_fails(tmp_path: Path) -> None:
    workspaces = manager(tmp_path / "work")
    with pytest.raises(RuntimeError, match="processing failed"):
        with workspaces.workspace(JOB_ID) as workspace:
            (workspace / "raw-source.bin").write_bytes(b"ephemeral")
            raise RuntimeError("processing failed")

    assert list(workspaces.root.iterdir()) == []


def test_ttl_cleanup_only_removes_valid_expired_managed_directories(
    tmp_path: Path,
) -> None:
    workspaces = manager(tmp_path / "work")
    expired_id = "30000000-0000-4000-8000-000000000003"
    expired = workspaces.root / expired_id
    expired.mkdir()
    (expired / ".mise-workspace.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "jobId": expired_id,
                "createdAt": "2026-08-10T00:00:00+00:00",
                "rawMedia": True,
            }
        ),
        encoding="utf-8",
    )
    (expired / "raw.mp4").write_bytes(b"not persistent")

    unmarked = workspaces.root / "do-not-touch"
    unmarked.mkdir()
    (unmarked / "unrelated.txt").write_text("keep", encoding="utf-8")

    removed = workspaces.cleanup_expired(
        datetime(2026, 8, 13, tzinfo=UTC)
    )
    assert removed == (expired,)
    assert not expired.exists()
    assert unmarked.exists()


def test_fixture_pipeline_reaches_review_and_cleans_workspace(
    tmp_path: Path,
) -> None:
    reporter = InMemoryJobReporter()
    workspaces = manager(tmp_path / "work")
    pipeline = IngestionPipeline(workspaces=workspaces, reporter=reporter)
    job = ImportJob(
        id=JOB_ID,
        owner_id=OWNER_ID,
        source_url="fixture://scenarios/zh-short-ocr-led",
    )

    result = asyncio.run(pipeline.run(job))

    assert result.source_bundle["fixture"] is True
    assert result.source_bundle["rawMediaPersisted"] is False
    assert result.recipe["fixture"] is True
    assert reporter.transitions[-1][1] is JobStage.NEEDS_REVIEW
    assert list(workspaces.root.iterdir()) == []


def test_live_pipeline_fails_honestly_before_creating_media(
    tmp_path: Path,
) -> None:
    reporter = InMemoryJobReporter()
    workspaces = manager(tmp_path / "work")
    pipeline = IngestionPipeline(workspaces=workspaces, reporter=reporter)
    job = ImportJob(
        id=JOB_ID,
        owner_id=OWNER_ID,
        source_url="https://youtube.com/watch?v=abc",
    )

    with pytest.raises(PlatformAcquisitionNotConfiguredError):
        asyncio.run(pipeline.run(job))

    assert reporter.failures
    assert reporter.transitions[-1][1] is JobStage.FAILED
    assert list(workspaces.root.iterdir()) == []


def test_cancellation_is_checked_at_stage_boundaries(tmp_path: Path) -> None:
    reporter = InMemoryJobReporter()
    reporter.cancelled_jobs.add(JOB_ID)
    pipeline = IngestionPipeline(
        workspaces=manager(tmp_path / "work"),
        reporter=reporter,
    )
    job = ImportJob(
        id=JOB_ID,
        owner_id=OWNER_ID,
        source_url="fixture://scenarios/zh-short-ocr-led",
    )

    with pytest.raises(JobCancelledError):
        asyncio.run(pipeline.run(job))
    assert reporter.transitions[-1][1] is JobStage.CANCELLED
