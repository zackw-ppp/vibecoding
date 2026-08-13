from __future__ import annotations

import json
import os
import shutil
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID

from .errors import TemporaryStorageLimitError

_MARKER_NAME = ".mise-workspace.json"


class WorkspaceManager:
    """
    Owns per-job ephemeral directories.

    Successful, failed, and cancelled jobs are removed in `finally`. TTL
    cleanup is a crash-recovery backstop and deletes only directories carrying
    a valid marker created by this manager. Symlinks are never followed.
    """

    def __init__(
        self,
        root: Path,
        *,
        raw_media_ttl: timedelta,
        disk_limit_bytes: int,
    ) -> None:
        if raw_media_ttl <= timedelta(0) or raw_media_ttl > timedelta(hours=24):
            raise ValueError("raw media TTL must be greater than 0 and at most 24h")
        if disk_limit_bytes <= 0:
            raise ValueError("disk limit must be positive")

        root.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.root = root.resolve()
        if self.root == Path(self.root.anchor):
            raise ValueError("filesystem root cannot be a workspace root")
        self.raw_media_ttl = raw_media_ttl
        self.disk_limit_bytes = disk_limit_bytes

    @contextmanager
    def workspace(self, job_id: UUID | str) -> Iterator[Path]:
        normalized_job_id = str(UUID(str(job_id)))
        self.ensure_capacity(1)
        path = self.root / normalized_job_id
        if path.exists() or path.is_symlink():
            raise TemporaryStorageLimitError(
                "a workspace for this job already exists"
            )

        path.mkdir(mode=0o700)
        marker = {
            "schemaVersion": 1,
            "jobId": normalized_job_id,
            "createdAt": datetime.now(UTC).isoformat(),
            "rawMedia": True,
        }
        marker_path = path / _MARKER_NAME
        marker_path.write_text(
            json.dumps(marker, separators=(",", ":"), sort_keys=True),
            encoding="utf-8",
        )
        marker_path.chmod(0o600)

        try:
            yield path
            self.ensure_capacity(0)
        finally:
            self._remove_managed(path, expected_job_id=normalized_job_id)

    def cleanup_expired(self, now: datetime | None = None) -> tuple[Path, ...]:
        current = now or datetime.now(UTC)
        if current.tzinfo is None:
            raise ValueError("cleanup time must be timezone-aware")

        removed: list[Path] = []
        for candidate in self.root.iterdir():
            if candidate.is_symlink() or not candidate.is_dir():
                continue
            marker = self._read_marker(candidate)
            if marker is None:
                continue
            try:
                created_at = datetime.fromisoformat(str(marker["createdAt"]))
                job_id = str(UUID(str(marker["jobId"])))
            except (KeyError, TypeError, ValueError):
                continue
            if created_at.tzinfo is None:
                continue
            if current - created_at <= self.raw_media_ttl:
                continue
            if self._remove_managed(candidate, expected_job_id=job_id):
                removed.append(candidate)
        return tuple(removed)

    def ensure_capacity(self, additional_bytes: int) -> None:
        if additional_bytes < 0:
            raise ValueError("additional bytes cannot be negative")
        managed_bytes = self.managed_bytes()
        if managed_bytes + additional_bytes > self.disk_limit_bytes:
            raise TemporaryStorageLimitError()
        available = shutil.disk_usage(self.root).free
        if additional_bytes > available:
            raise TemporaryStorageLimitError("ephemeral volume has insufficient space")

    def managed_bytes(self) -> int:
        total = 0
        for directory, subdirectories, filenames in os.walk(
            self.root, followlinks=False
        ):
            base = Path(directory)
            subdirectories[:] = [
                name for name in subdirectories if not (base / name).is_symlink()
            ]
            for filename in filenames:
                path = base / filename
                if path.is_symlink():
                    continue
                try:
                    total += path.stat().st_size
                except FileNotFoundError:
                    continue
        return total

    def _read_marker(self, path: Path) -> dict[str, object] | None:
        marker_path = path / _MARKER_NAME
        if marker_path.is_symlink() or not marker_path.is_file():
            return None
        try:
            payload = json.loads(marker_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError):
            return None
        if not isinstance(payload, dict) or payload.get("schemaVersion") != 1:
            return None
        return payload

    def _remove_managed(self, path: Path, *, expected_job_id: str) -> bool:
        if path.parent.resolve() != self.root:
            raise RuntimeError("refusing to remove a path outside the workspace root")
        if path.is_symlink():
            path.unlink(missing_ok=True)
            return True
        marker = self._read_marker(path)
        if marker is None or marker.get("jobId") != expected_job_id:
            return False
        shutil.rmtree(path)
        return True
