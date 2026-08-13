from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Mapping
from contextlib import suppress
from datetime import UTC, datetime
from typing import Protocol, TypeVar
from uuid import UUID

from .adapters import AdapterRegistry
from .errors import (
    ErrorCode,
    InvalidStageTransitionError,
    JobCancelledError,
    ProviderNotConfiguredError,
    WorkerError,
)
from .models import ImportJob, JobStage, PipelineResult, Platform
from .providers import ProviderSet
from .workspace import WorkspaceManager

T = TypeVar("T")

_FORWARD_STAGES: tuple[JobStage, ...] = (
    JobStage.QUEUED,
    JobStage.RESOLVING_SOURCE,
    JobStage.DOWNLOADING_MEDIA,
    JobStage.EXTRACTING_METADATA,
    JobStage.EXTRACTING_CAPTIONS,
    JobStage.TRANSCRIBING,
    JobStage.SAMPLING_FRAMES,
    JobStage.RUNNING_OCR,
    JobStage.STRUCTURING_RECIPE,
    JobStage.ALIGNING_EVIDENCE,
    JobStage.RENDERING_STEP_CLIPS,
    JobStage.UPLOADING_ASSETS,
    JobStage.NEEDS_REVIEW,
    JobStage.COMPLETE,
)

_TRANSITIONS: dict[JobStage, frozenset[JobStage]] = {}
for index, stage in enumerate(_FORWARD_STAGES):
    following = _FORWARD_STAGES[index + 1 : index + 2]
    allowed = set(following)
    if stage not in {JobStage.NEEDS_REVIEW, JobStage.COMPLETE}:
        allowed.update(
            {
                JobStage.CANCELLED,
                JobStage.FAILED,
                JobStage.PARTIAL_FAILURE,
                JobStage.STALLED,
            }
        )
    _TRANSITIONS[stage] = frozenset(allowed)
_TRANSITIONS[JobStage.STALLED] = frozenset(
    {
        JobStage.QUEUED,
        JobStage.RESOLVING_SOURCE,
        JobStage.CANCELLED,
        JobStage.FAILED,
    }
)
_TRANSITIONS[JobStage.FAILED] = frozenset({JobStage.QUEUED})
_TRANSITIONS[JobStage.PARTIAL_FAILURE] = frozenset(
    {JobStage.QUEUED, JobStage.NEEDS_REVIEW}
)
_TRANSITIONS[JobStage.CANCELLED] = frozenset()
_TRANSITIONS[JobStage.COMPLETE] = frozenset()

STAGE_PROGRESS: Mapping[JobStage, int] = {
    JobStage.QUEUED: 0,
    JobStage.RESOLVING_SOURCE: 3,
    JobStage.DOWNLOADING_MEDIA: 10,
    JobStage.EXTRACTING_METADATA: 18,
    JobStage.EXTRACTING_CAPTIONS: 25,
    JobStage.TRANSCRIBING: 35,
    JobStage.SAMPLING_FRAMES: 47,
    JobStage.RUNNING_OCR: 57,
    JobStage.STRUCTURING_RECIPE: 68,
    JobStage.ALIGNING_EVIDENCE: 78,
    JobStage.RENDERING_STEP_CLIPS: 87,
    JobStage.UPLOADING_ASSETS: 95,
    JobStage.NEEDS_REVIEW: 100,
    JobStage.COMPLETE: 100,
    JobStage.PARTIAL_FAILURE: 100,
    JobStage.FAILED: 100,
    JobStage.CANCELLED: 100,
    JobStage.STALLED: 0,
}


class PipelineStateMachine:
    def __init__(self, initial: JobStage) -> None:
        self.current = initial

    def can_transition(self, requested: JobStage) -> bool:
        return requested is self.current or requested in _TRANSITIONS[self.current]

    def transition(self, requested: JobStage) -> JobStage:
        if not self.can_transition(requested):
            raise InvalidStageTransitionError(
                self.current.value, requested.value
            )
        self.current = requested
        return self.current


class JobReporter(Protocol):
    async def transition(
        self, job_id: UUID, stage: JobStage, progress: int
    ) -> None: ...

    async def heartbeat(self, job_id: UUID, stage: JobStage) -> None: ...

    async def cancellation_requested(self, job_id: UUID) -> bool: ...

    async def failed(
        self, job_id: UUID, stage: JobStage, error: WorkerError
    ) -> None: ...


class InMemoryJobReporter:
    """Test/local reporter. Production wiring must persist through Supabase."""

    def __init__(self) -> None:
        self.transitions: list[tuple[UUID, JobStage, int]] = []
        self.failures: list[tuple[UUID, JobStage, WorkerError]] = []
        self.cancelled_jobs: set[UUID] = set()

    async def transition(
        self, job_id: UUID, stage: JobStage, progress: int
    ) -> None:
        self.transitions.append((job_id, stage, progress))

    async def heartbeat(self, job_id: UUID, stage: JobStage) -> None:
        del job_id, stage

    async def cancellation_requested(self, job_id: UUID) -> bool:
        return job_id in self.cancelled_jobs

    async def failed(
        self, job_id: UUID, stage: JobStage, error: WorkerError
    ) -> None:
        self.failures.append((job_id, stage, error))


class IngestionPipeline:
    def __init__(
        self,
        *,
        workspaces: WorkspaceManager,
        reporter: JobReporter,
        adapters: AdapterRegistry | None = None,
        live_providers: ProviderSet | None = None,
        fixture_providers: ProviderSet | None = None,
        heartbeat_interval_seconds: float = 15.0,
    ) -> None:
        if heartbeat_interval_seconds <= 0:
            raise ValueError("heartbeat interval must be positive")
        self.workspaces = workspaces
        self.reporter = reporter
        self.adapters = adapters or AdapterRegistry()
        self.live_providers = live_providers or ProviderSet.unconfigured()
        self.fixture_providers = fixture_providers or ProviderSet.fixture()
        self.heartbeat_interval_seconds = heartbeat_interval_seconds

    async def run(self, job: ImportJob) -> PipelineResult:
        state = PipelineStateMachine(job.stage)
        try:
            if job.cancel_requested:
                raise JobCancelledError()
            await self._move(job.id, state, JobStage.RESOLVING_SOURCE)
            adapter = self.adapters.detect(job.source_url)
            source = await self._execute(
                job.id, state, adapter.resolve(job.source_url)
            )
            providers = (
                self.fixture_providers
                if source.platform is Platform.FIXTURE
                else self.live_providers
            )

            await self._move(job.id, state, JobStage.DOWNLOADING_MEDIA)
            with self.workspaces.workspace(job.id) as workspace:
                media = await self._execute(
                    job.id, state, adapter.acquire_media(source, workspace)
                )
                self.workspaces.ensure_capacity(0)

                await self._move(job.id, state, JobStage.EXTRACTING_METADATA)
                await self._move(job.id, state, JobStage.EXTRACTING_CAPTIONS)
                await self._move(job.id, state, JobStage.TRANSCRIBING)
                transcript = await self._execute(
                    job.id, state, providers.speech_to_text.transcribe(media)
                )

                await self._move(job.id, state, JobStage.SAMPLING_FRAMES)
                await self._move(job.id, state, JobStage.RUNNING_OCR)
                ocr = await self._execute(
                    job.id, state, providers.ocr.recognize(media)
                )

                await self._move(job.id, state, JobStage.STRUCTURING_RECIPE)
                recipe = await self._execute(
                    job.id,
                    state,
                    providers.extraction.extract(source, transcript, ocr),
                )

                await self._move(job.id, state, JobStage.ALIGNING_EVIDENCE)
                if source.platform is not Platform.FIXTURE:
                    raise ProviderNotConfiguredError(
                        "live evidence alignment", "not-configured"
                    )
                source_bundle: dict[str, object] = {
                    "schemaVersion": 1,
                    "fixture": True,
                    "source": source.model_dump(mode="json"),
                    "nativeCaptions": [],
                    "asrTranscript": [
                        item.model_dump(mode="json") for item in transcript
                    ],
                    "ocrSegments": [item.model_dump(mode="json") for item in ocr],
                    "rawMediaPersisted": False,
                }
                review_issues: tuple[dict[str, object], ...] = (
                    {
                        "type": "missing_quantity",
                        "severity": "warning",
                        "target": "salt",
                        "sourceValue": "适量",
                        "suggestedValue": None,
                    },
                )

                await self._move(job.id, state, JobStage.RENDERING_STEP_CLIPS)
                # Fixture clips are textual manifests. Live rendering remains
                # unreachable until a real adapter/provider stack is configured.
                await self._move(job.id, state, JobStage.UPLOADING_ASSETS)
                await self._move(job.id, state, JobStage.NEEDS_REVIEW)

                return PipelineResult(
                    job_id=job.id,
                    source_bundle=source_bundle,
                    recipe=recipe,
                    review_issues=review_issues,
                    completed_at=datetime.now(UTC),
                )
        except JobCancelledError:
            if state.can_transition(JobStage.CANCELLED):
                state.transition(JobStage.CANCELLED)
                await self.reporter.transition(
                    job.id,
                    JobStage.CANCELLED,
                    STAGE_PROGRESS[JobStage.CANCELLED],
                )
            raise
        except WorkerError as error:
            await self.reporter.failed(job.id, state.current, error)
            if state.can_transition(JobStage.FAILED):
                state.transition(JobStage.FAILED)
                await self.reporter.transition(
                    job.id,
                    JobStage.FAILED,
                    STAGE_PROGRESS[JobStage.FAILED],
                )
            raise
        except Exception as error:
            safe_error = WorkerError(
                ErrorCode.UNKNOWN_ERROR,
                "unexpected pipeline failure",
                retryable=True,
            )
            await self.reporter.failed(job.id, state.current, safe_error)
            if state.can_transition(JobStage.FAILED):
                state.transition(JobStage.FAILED)
                await self.reporter.transition(
                    job.id,
                    JobStage.FAILED,
                    STAGE_PROGRESS[JobStage.FAILED],
                )
            raise safe_error from error

    async def _move(
        self, job_id: UUID, state: PipelineStateMachine, requested: JobStage
    ) -> None:
        if await self.reporter.cancellation_requested(job_id):
            raise JobCancelledError()
        state.transition(requested)
        await self.reporter.transition(
            job_id, requested, STAGE_PROGRESS[requested]
        )
        await self.reporter.heartbeat(job_id, requested)

    async def _execute(
        self,
        job_id: UUID,
        state: PipelineStateMachine,
        operation: Awaitable[T],
    ) -> T:
        task = asyncio.ensure_future(operation)
        try:
            while True:
                done, _ = await asyncio.wait(
                    (task,),
                    timeout=self.heartbeat_interval_seconds,
                )
                if task in done:
                    return await task
                await self.reporter.heartbeat(job_id, state.current)
                if await self.reporter.cancellation_requested(job_id):
                    task.cancel()
                    with suppress(asyncio.CancelledError):
                        await task
                    raise JobCancelledError()
        finally:
            if not task.done():
                task.cancel()
                with suppress(asyncio.CancelledError):
                    await task
