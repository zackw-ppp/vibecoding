from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from recipe_worker.adapters import (
    AdapterRegistry,
    BilibiliAdapter,
    DouyinAdapter,
    FixtureAdapter,
    PlatformAdapter,
    TikTokAdapter,
    XiaohongshuAdapter,
    YouTubeAdapter,
    validate_public_dns_answers,
)
from recipe_worker.errors import (
    PlatformAcquisitionNotConfiguredError,
    UnsafeSourceUrlError,
)
from recipe_worker.models import ContentType, Platform, ResolvedSource


@pytest.mark.parametrize(
    ("url", "platform", "canonical"),
    [
        (
            "https://www.youtube.com/watch?v=abc_123&utm_source=share&si=secret",
            Platform.YOUTUBE,
            "https://youtube.com/watch?v=abc_123",
        ),
        (
            "http://www.bilibili.com/video/BV1xx411c7mD/?spm_id_from=333",
            Platform.BILIBILI,
            "https://bilibili.com/video/BV1xx411c7mD",
        ),
        (
            "https://www.tiktok.com/@cook/video/741234567890?utm_medium=share",
            Platform.TIKTOK,
            "https://tiktok.com/@cook/video/741234567890",
        ),
        (
            "https://www.xiaohongshu.com/explore/66aBcD123?share_token=sensitive",
            Platform.XIAOHONGSHU,
            "https://xiaohongshu.com/explore/66aBcD123",
        ),
        (
            "https://www.douyin.com/video/741234567890",
            Platform.DOUYIN,
            "https://douyin.com/video/741234567890",
        ),
        (
            "fixture://scenarios/zh-short-ocr-led",
            Platform.FIXTURE,
            "fixture://scenarios/zh-short-ocr-led",
        ),
    ],
)
def test_detects_and_normalizes_supported_urls(
    url: str, platform: Platform, canonical: str
) -> None:
    normalized = AdapterRegistry().normalize(url)
    assert normalized.platform is platform
    assert normalized.canonical_url == canonical


@pytest.mark.parametrize(
    "url",
    [
        "https://youtube.com.evil.example/watch?v=abc",
        "https://youtube.com:8443/watch?v=abc",
        "https://user:password@youtube.com/watch?v=abc",
        "https://youtube.com/redirect?q=http://169.254.169.254/",
        "file:///etc/passwd",
        "https://127.0.0.1/video/123",
        "fixture://scenarios/not-registered",
    ],
)
def test_rejects_unsafe_or_unsupported_urls(url: str) -> None:
    with pytest.raises(UnsafeSourceUrlError):
        AdapterRegistry().normalize(url)


@pytest.mark.parametrize(
    ("adapter", "url"),
    [
        (YouTubeAdapter(), "https://youtube.com/watch?v=abc"),
        (BilibiliAdapter(), "https://bilibili.com/video/BV1xx411c7mD"),
        (TikTokAdapter(), "https://tiktok.com/@cook/video/741234567890"),
        (
            XiaohongshuAdapter(),
            "https://xiaohongshu.com/explore/66aBcD123",
        ),
        (DouyinAdapter(), "https://douyin.com/video/741234567890"),
    ],
)
def test_live_adapters_explicitly_refuse_unconfigured_acquisition(
    adapter: PlatformAdapter, url: str, tmp_path: Path
) -> None:
    with pytest.raises(PlatformAcquisitionNotConfiguredError):
        asyncio.run(adapter.resolve(url))

    normalized = adapter.normalize_url(url)
    source = ResolvedSource(
        platform=normalized.platform,
        content_type=ContentType.VIDEO,
        original_url=url,
        canonical_url=normalized.canonical_url,
        platform_post_id=None,
        title=None,
        author_name=None,
    )
    with pytest.raises(PlatformAcquisitionNotConfiguredError):
        asyncio.run(adapter.acquire_media(source, tmp_path))


def test_fixture_adapter_writes_only_an_explicit_text_manifest(
    tmp_path: Path,
) -> None:
    adapter = FixtureAdapter()
    source = asyncio.run(
        adapter.resolve("fixture://scenarios/zh-short-ocr-led")
    )
    acquired = asyncio.run(adapter.acquire_media(source, tmp_path))

    assert acquired.fixture is True
    assert acquired.files == (tmp_path / "fixture-source.json",)
    assert '"fixture": true' in acquired.files[0].read_text(encoding="utf-8")
    assert not any(path.suffix == ".mp4" for path in tmp_path.iterdir())


def test_dns_boundary_rejects_any_non_global_answer() -> None:
    validate_public_dns_answers("example.test", ["8.8.8.8"])
    with pytest.raises(UnsafeSourceUrlError, match="non-global"):
        validate_public_dns_answers(
            "example.test", ["8.8.8.8", "169.254.169.254"]
        )
    with pytest.raises(UnsafeSourceUrlError, match="no addresses"):
        validate_public_dns_answers("example.test", [])
