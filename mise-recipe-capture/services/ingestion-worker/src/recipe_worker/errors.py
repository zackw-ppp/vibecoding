from __future__ import annotations

from enum import StrEnum


class ErrorCode(StrEnum):
    UNSUPPORTED_URL = "UNSUPPORTED_URL"
    SOURCE_UNAVAILABLE = "SOURCE_UNAVAILABLE"
    AUTH_REQUIRED = "AUTH_REQUIRED"
    REGION_RESTRICTED = "REGION_RESTRICTED"
    MEDIA_DOWNLOAD_FAILED = "MEDIA_DOWNLOAD_FAILED"
    UNSUPPORTED_CODEC = "UNSUPPORTED_CODEC"
    UPLOAD_INTERRUPTED = "UPLOAD_INTERRUPTED"
    CAPTION_EXTRACTION_FAILED = "CAPTION_EXTRACTION_FAILED"
    TRANSCRIPTION_FAILED = "TRANSCRIPTION_FAILED"
    OCR_FAILED = "OCR_FAILED"
    NO_RECIPE_DETECTED = "NO_RECIPE_DETECTED"
    MULTIPLE_RECIPES_DETECTED = "MULTIPLE_RECIPES_DETECTED"
    MODEL_INVALID_OUTPUT = "MODEL_INVALID_OUTPUT"
    EVIDENCE_ALIGNMENT_FAILED = "EVIDENCE_ALIGNMENT_FAILED"
    CLIP_RENDER_FAILED = "CLIP_RENDER_FAILED"
    STORAGE_QUOTA_EXCEEDED = "STORAGE_QUOTA_EXCEEDED"
    JOB_TIMEOUT = "JOB_TIMEOUT"
    JOB_CANCELLED = "JOB_CANCELLED"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    UNAUTHORIZED = "UNAUTHORIZED"
    RATE_LIMITED = "RATE_LIMITED"
    REVISION_CONFLICT = "REVISION_CONFLICT"
    PROVIDER_NOT_CONFIGURED = "PROVIDER_NOT_CONFIGURED"
    TEMP_STORAGE_LIMIT = "TEMP_STORAGE_LIMIT"


class WorkerError(RuntimeError):
    """Expected worker failure safe to map to a standardized job error."""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        *,
        retryable: bool,
        debug_reference: str | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable
        self.debug_reference = debug_reference


class ProviderNotConfiguredError(WorkerError):
    def __init__(self, capability: str, provider: str = "not-configured") -> None:
        super().__init__(
            ErrorCode.PROVIDER_NOT_CONFIGURED,
            f"{capability} provider is not configured ({provider})",
            retryable=False,
        )
        self.capability = capability
        self.provider = provider


class PlatformAcquisitionNotConfiguredError(WorkerError):
    def __init__(self, platform: str, operation: str) -> None:
        super().__init__(
            ErrorCode.PROVIDER_NOT_CONFIGURED,
            f"{platform} {operation} is not configured",
            retryable=False,
        )
        self.platform = platform
        self.operation = operation


class UnsafeSourceUrlError(WorkerError):
    def __init__(self, reason: str) -> None:
        super().__init__(
            ErrorCode.UNSUPPORTED_URL,
            reason,
            retryable=False,
        )


class InvalidStageTransitionError(WorkerError):
    def __init__(self, current: str, requested: str) -> None:
        super().__init__(
            ErrorCode.UNKNOWN_ERROR,
            f"invalid stage transition: {current} -> {requested}",
            retryable=False,
        )
        self.current = current
        self.requested = requested


class TemporaryStorageLimitError(WorkerError):
    def __init__(self, message: str = "temporary storage safety limit reached") -> None:
        super().__init__(
            ErrorCode.TEMP_STORAGE_LIMIT,
            message,
            retryable=True,
        )


class JobCancelledError(WorkerError):
    def __init__(self) -> None:
        super().__init__(
            ErrorCode.JOB_CANCELLED,
            "job cancellation was requested",
            retryable=False,
        )
