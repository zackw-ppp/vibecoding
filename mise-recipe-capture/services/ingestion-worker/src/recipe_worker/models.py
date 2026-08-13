from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from pathlib import Path
from typing import Annotated, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)


class Platform(StrEnum):
    YOUTUBE = "youtube"
    BILIBILI = "bilibili"
    TIKTOK = "tiktok"
    XIAOHONGSHU = "xiaohongshu"
    DOUYIN = "douyin"
    FIXTURE = "fixture"


class ContentType(StrEnum):
    VIDEO = "video"
    IMAGE_POST = "image_post"
    FIXTURE = "fixture"


class JobStage(StrEnum):
    QUEUED = "queued"
    RESOLVING_SOURCE = "resolving_source"
    DOWNLOADING_MEDIA = "downloading_media"
    EXTRACTING_METADATA = "extracting_metadata"
    EXTRACTING_CAPTIONS = "extracting_captions"
    TRANSCRIBING = "transcribing"
    SAMPLING_FRAMES = "sampling_frames"
    RUNNING_OCR = "running_ocr"
    STRUCTURING_RECIPE = "structuring_recipe"
    ALIGNING_EVIDENCE = "aligning_evidence"
    RENDERING_STEP_CLIPS = "rendering_step_clips"
    UPLOADING_ASSETS = "uploading_assets"
    NEEDS_REVIEW = "needs_review"
    COMPLETE = "complete"
    PARTIAL_FAILURE = "partial_failure"
    FAILED = "failed"
    CANCELLED = "cancelled"
    STALLED = "stalled"


class ImportJob(StrictModel):
    id: UUID
    owner_id: UUID
    source_url: Annotated[str, Field(min_length=1, max_length=2_048)]
    stage: JobStage = JobStage.QUEUED
    progress: Annotated[int, Field(ge=0, le=100)] = 0
    cancel_requested: bool = False


class NormalizedUrl(StrictModel):
    original_url: str
    canonical_url: str
    platform: Platform
    requires_redirect_resolution: bool


class ResolvedSource(StrictModel):
    platform: Platform
    content_type: ContentType
    original_url: str
    canonical_url: str
    platform_post_id: str | None
    title: str | None
    author_name: str | None
    metadata: dict[str, object] = Field(default_factory=dict)


class AcquiredMedia(StrictModel):
    workspace: Path
    files: tuple[Path, ...]
    total_bytes: Annotated[int, Field(ge=0)]
    fixture: bool = False

    @model_validator(mode="after")
    def files_stay_in_workspace(self) -> Self:
        workspace = self.workspace.resolve()
        for file_path in self.files:
            try:
                file_path.resolve().relative_to(workspace)
            except ValueError as error:
                raise ValueError(
                    "acquired files must stay inside the workspace"
                ) from error
        return self


class TimedTextSegment(StrictModel):
    start_seconds: Annotated[float, Field(ge=0)]
    end_seconds: Annotated[float, Field(ge=0)]
    text: Annotated[str, Field(min_length=1, max_length=100_000)]
    language: Annotated[str, Field(min_length=1, max_length=35)]
    confidence: Annotated[float | None, Field(ge=0, le=1)] = None

    @model_validator(mode="after")
    def time_range_is_ordered(self) -> Self:
        if self.end_seconds < self.start_seconds:
            raise ValueError("end_seconds must be at or after start_seconds")
        return self


class OcrSegment(StrictModel):
    timestamp_seconds: Annotated[float, Field(ge=0)]
    text: Annotated[str, Field(min_length=1, max_length=100_000)]
    language: Annotated[str, Field(min_length=1, max_length=35)]
    bbox: tuple[float, float, float, float]
    confidence: Annotated[float | None, Field(ge=0, le=1)] = None

    @model_validator(mode="after")
    def bounding_box_is_valid(self) -> Self:
        x, y, width, height = self.bbox
        if x < 0 or y < 0 or width <= 0 or height <= 0:
            raise ValueError("bbox must contain nonnegative x/y and positive size")
        return self


class PipelineResult(StrictModel):
    job_id: UUID
    source_bundle: dict[str, object]
    recipe: dict[str, object]
    review_issues: tuple[dict[str, object], ...]
    completed_at: datetime
