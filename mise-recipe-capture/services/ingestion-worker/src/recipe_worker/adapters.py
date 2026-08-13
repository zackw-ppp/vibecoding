from __future__ import annotations

import ipaddress
import json
import re
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import ClassVar, Protocol, runtime_checkable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .errors import (
    PlatformAcquisitionNotConfiguredError,
    UnsafeSourceUrlError,
)
from .models import (
    AcquiredMedia,
    ContentType,
    NormalizedUrl,
    Platform,
    ResolvedSource,
)

_TRACKING_PARAMETERS = {
    "fbclid",
    "gclid",
    "igshid",
    "share_app_id",
    "share_item_id",
    "share_link_id",
    "share_source",
    "share_token",
    "source",
    "spm_id_from",
    "timestamp",
    "tt_from",
    "u_code",
    "si",
}


@runtime_checkable
class PlatformAdapter(Protocol):
    platform: Platform

    def can_handle(self, url: str) -> bool: ...

    def normalize_url(self, url: str) -> NormalizedUrl: ...

    async def resolve(self, url: str) -> ResolvedSource: ...

    async def acquire_media(
        self, source: ResolvedSource, workspace: Path
    ) -> AcquiredMedia: ...


class AllowlistedPlatformAdapter:
    """Syntactic URL boundary for one platform; performs no network access."""

    platform: ClassVar[Platform]
    host_aliases: ClassVar[dict[str, str]]
    short_hosts: ClassVar[frozenset[str]] = frozenset()

    def can_handle(self, url: str) -> bool:
        try:
            return self.normalize_url(url).platform is self.platform
        except UnsafeSourceUrlError:
            return False

    def normalize_url(self, url: str) -> NormalizedUrl:
        original = url.strip()
        if not original or len(original) > 2_048:
            raise UnsafeSourceUrlError("URL length is invalid")
        if "\\" in original:
            raise UnsafeSourceUrlError("backslashes are not allowed in source URLs")

        try:
            parsed = urlsplit(original)
            port = parsed.port
        except ValueError as error:
            raise UnsafeSourceUrlError("URL is malformed") from error
        if parsed.scheme.lower() not in {"http", "https"}:
            raise UnsafeSourceUrlError("only HTTP(S) source URLs are supported")
        if parsed.username or parsed.password or port is not None:
            raise UnsafeSourceUrlError(
                "URL credentials and explicit ports are not allowed"
            )

        hostname = (parsed.hostname or "").lower().rstrip(".")
        try:
            ipaddress.ip_address(hostname)
        except ValueError:
            pass
        else:
            raise UnsafeSourceUrlError("IP-literal source URLs are not allowed")

        canonical_host = self.host_aliases.get(hostname)
        if canonical_host is None:
            raise UnsafeSourceUrlError("source host is not allowlisted")
        if not self._valid_path(parsed.path, parsed.query):
            raise UnsafeSourceUrlError("URL is not a supported public post URL")

        query = sorted(
            (key, value)
            for key, value in parse_qsl(
                parsed.query, keep_blank_values=True, strict_parsing=False
            )
            if not key.lower().startswith("utm_")
            and key.lower() not in _TRACKING_PARAMETERS
        )
        path = parsed.path.rstrip("/") or "/"
        canonical = urlunsplit(
            ("https", canonical_host, path, urlencode(query, doseq=True), "")
        )
        return NormalizedUrl(
            original_url=original,
            canonical_url=canonical,
            platform=self.platform,
            requires_redirect_resolution=hostname in self.short_hosts,
        )

    async def resolve(self, url: str) -> ResolvedSource:
        self.normalize_url(url)
        raise PlatformAcquisitionNotConfiguredError(
            self.platform.value, "metadata acquisition"
        )

    async def acquire_media(
        self, source: ResolvedSource, workspace: Path
    ) -> AcquiredMedia:
        del source, workspace
        raise PlatformAcquisitionNotConfiguredError(
            self.platform.value, "media acquisition"
        )

    def _valid_path(self, path: str, query: str) -> bool:
        raise NotImplementedError


class YouTubeAdapter(AllowlistedPlatformAdapter):
    platform = Platform.YOUTUBE
    host_aliases = {
        "youtube.com": "youtube.com",
        "www.youtube.com": "youtube.com",
        "m.youtube.com": "youtube.com",
        "youtu.be": "youtu.be",
    }
    short_hosts = frozenset({"youtu.be"})

    def _valid_path(self, path: str, query: str) -> bool:
        if path == "/watch":
            return any(key == "v" and value for key, value in parse_qsl(query))
        return bool(re.fullmatch(r"/(?:shorts|live)/[A-Za-z0-9_-]+/?", path)) or (
            self._is_short_host_path(path)
        )

    @staticmethod
    def _is_short_host_path(path: str) -> bool:
        return bool(re.fullmatch(r"/[A-Za-z0-9_-]+/?", path))

    def normalize_url(self, url: str) -> NormalizedUrl:
        normalized = super().normalize_url(url)
        hostname = (urlsplit(url.strip()).hostname or "").lower().rstrip(".")
        if hostname != "youtu.be" and re.fullmatch(
            r"/[A-Za-z0-9_-]+/?", urlsplit(url.strip()).path
        ):
            raise UnsafeSourceUrlError("unsupported YouTube path")
        return normalized


class BilibiliAdapter(AllowlistedPlatformAdapter):
    platform = Platform.BILIBILI
    host_aliases = {
        "bilibili.com": "bilibili.com",
        "www.bilibili.com": "bilibili.com",
        "m.bilibili.com": "bilibili.com",
        "b23.tv": "b23.tv",
    }
    short_hosts = frozenset({"b23.tv"})

    def _valid_path(self, path: str, query: str) -> bool:
        del query
        return bool(
            re.fullmatch(r"/video/(?:BV[A-Za-z0-9]+|av[0-9]+)/?", path)
            or re.fullmatch(r"/[A-Za-z0-9_-]+/?", path)
        )

    def normalize_url(self, url: str) -> NormalizedUrl:
        normalized = super().normalize_url(url)
        parsed = urlsplit(url.strip())
        hostname = (parsed.hostname or "").lower().rstrip(".")
        if hostname != "b23.tv" and not parsed.path.startswith("/video/"):
            raise UnsafeSourceUrlError("unsupported Bilibili path")
        return normalized


class TikTokAdapter(AllowlistedPlatformAdapter):
    platform = Platform.TIKTOK
    host_aliases = {
        "tiktok.com": "tiktok.com",
        "www.tiktok.com": "tiktok.com",
        "m.tiktok.com": "tiktok.com",
        "vm.tiktok.com": "vm.tiktok.com",
        "vt.tiktok.com": "vt.tiktok.com",
    }
    short_hosts = frozenset({"vm.tiktok.com", "vt.tiktok.com"})

    def _valid_path(self, path: str, query: str) -> bool:
        del query
        return bool(
            re.fullmatch(r"/@[^/]+/(?:video|photo)/[0-9]+/?", path)
            or re.fullmatch(r"/[A-Za-z0-9_-]+/?", path)
        )

    def normalize_url(self, url: str) -> NormalizedUrl:
        normalized = super().normalize_url(url)
        parsed = urlsplit(url.strip())
        hostname = (parsed.hostname or "").lower().rstrip(".")
        if hostname not in self.short_hosts and not parsed.path.startswith("/@"):
            raise UnsafeSourceUrlError("unsupported TikTok path")
        return normalized


class XiaohongshuAdapter(AllowlistedPlatformAdapter):
    platform = Platform.XIAOHONGSHU
    host_aliases = {
        "xiaohongshu.com": "xiaohongshu.com",
        "www.xiaohongshu.com": "xiaohongshu.com",
        "xhslink.com": "xhslink.com",
    }
    short_hosts = frozenset({"xhslink.com"})

    def _valid_path(self, path: str, query: str) -> bool:
        del query
        return bool(
            re.fullmatch(
                r"/(?:explore|discovery/item)/[A-Za-z0-9_-]+/?", path
            )
            or re.fullmatch(r"/[A-Za-z0-9_-]+/?", path)
        )

    def normalize_url(self, url: str) -> NormalizedUrl:
        normalized = super().normalize_url(url)
        hostname = (urlsplit(url.strip()).hostname or "").lower().rstrip(".")
        path = urlsplit(url.strip()).path
        if hostname not in self.short_hosts and not (
            path.startswith("/explore/") or path.startswith("/discovery/item/")
        ):
            raise UnsafeSourceUrlError("unsupported Xiaohongshu path")
        return normalized


class DouyinAdapter(AllowlistedPlatformAdapter):
    platform = Platform.DOUYIN
    host_aliases = {
        "douyin.com": "douyin.com",
        "www.douyin.com": "douyin.com",
        "v.douyin.com": "v.douyin.com",
    }
    short_hosts = frozenset({"v.douyin.com"})

    def _valid_path(self, path: str, query: str) -> bool:
        del query
        return bool(
            re.fullmatch(r"/video/[0-9]+/?", path)
            or re.fullmatch(r"/[A-Za-z0-9_-]+/?", path)
        )

    def normalize_url(self, url: str) -> NormalizedUrl:
        normalized = super().normalize_url(url)
        parsed = urlsplit(url.strip())
        hostname = (parsed.hostname or "").lower().rstrip(".")
        if hostname not in self.short_hosts and not parsed.path.startswith("/video/"):
            raise UnsafeSourceUrlError("unsupported Douyin path")
        return normalized


FIXTURE_SCENARIOS = frozenset(
    {
        "zh-short-ocr-led",
        "zh-short-narration-led",
        "en-tiktok-style",
        "xiaohongshu-image-post",
        "missing-quantities",
        "multiple-recipes",
        "rapid-cuts-repeated-scenes",
        "long-form-video",
    }
)


class FixtureAdapter:
    platform = Platform.FIXTURE

    def can_handle(self, url: str) -> bool:
        try:
            self._scenario_id(url)
        except UnsafeSourceUrlError:
            return False
        return True

    def normalize_url(self, url: str) -> NormalizedUrl:
        scenario_id = self._scenario_id(url)
        canonical = f"fixture://scenarios/{scenario_id}"
        return NormalizedUrl(
            original_url=url,
            canonical_url=canonical,
            platform=Platform.FIXTURE,
            requires_redirect_resolution=False,
        )

    async def resolve(self, url: str) -> ResolvedSource:
        normalized = self.normalize_url(url)
        scenario_id = self._scenario_id(url)
        return ResolvedSource(
            platform=Platform.FIXTURE,
            content_type=ContentType.FIXTURE,
            original_url=normalized.original_url,
            canonical_url=normalized.canonical_url,
            platform_post_id=scenario_id,
            title=f"Fixture scenario: {scenario_id}",
            author_name="Mise Fixture Kitchen",
            metadata={"fixture": True, "raw_media_persisted": False},
        )

    async def acquire_media(
        self, source: ResolvedSource, workspace: Path
    ) -> AcquiredMedia:
        if source.platform is not Platform.FIXTURE:
            raise UnsafeSourceUrlError("fixture adapter received a non-fixture source")
        workspace.mkdir(parents=True, exist_ok=True)
        manifest = workspace / "fixture-source.json"
        payload = json.dumps(
            {
                "fixture": True,
                "scenario": source.platform_post_id,
                "rawMediaPersisted": False,
            },
            ensure_ascii=False,
            sort_keys=True,
        )
        manifest.write_text(payload, encoding="utf-8")
        return AcquiredMedia(
            workspace=workspace,
            files=(manifest,),
            total_bytes=manifest.stat().st_size,
            fixture=True,
        )

    @staticmethod
    def _scenario_id(url: str) -> str:
        parsed = urlsplit(url.strip())
        if (
            parsed.scheme != "fixture"
            or parsed.netloc != "scenarios"
            or parsed.query
            or parsed.fragment
        ):
            raise UnsafeSourceUrlError("fixture URL is invalid")
        scenario_id = parsed.path.strip("/")
        if scenario_id not in FIXTURE_SCENARIOS:
            raise UnsafeSourceUrlError("fixture scenario is not registered")
        return scenario_id


class AdapterRegistry:
    def __init__(self, adapters: Sequence[PlatformAdapter] | None = None) -> None:
        self._adapters = tuple(adapters or default_adapters())

    @property
    def adapters(self) -> tuple[PlatformAdapter, ...]:
        return self._adapters

    def detect(self, url: str) -> PlatformAdapter:
        for adapter in self._adapters:
            if adapter.can_handle(url):
                return adapter
        raise UnsafeSourceUrlError("no platform adapter accepts this URL")

    def normalize(self, url: str) -> NormalizedUrl:
        return self.detect(url).normalize_url(url)


def default_adapters() -> tuple[PlatformAdapter, ...]:
    return (
        YouTubeAdapter(),
        BilibiliAdapter(),
        TikTokAdapter(),
        XiaohongshuAdapter(),
        DouyinAdapter(),
        FixtureAdapter(),
    )


def validate_public_dns_answers(hostname: str, addresses: Iterable[str]) -> None:
    """
    Reject a DNS result unless every answer is globally routable.

    The eventual HTTP client must connect to one of these validated addresses
    while retaining the validated hostname for TLS/SNI. Re-run this check on
    every redirect; checking and then doing unrelated DNS resolution is still
    vulnerable to rebinding.
    """

    checked = 0
    for raw_address in addresses:
        checked += 1
        try:
            address = ipaddress.ip_address(raw_address)
        except ValueError as error:
            raise UnsafeSourceUrlError("DNS returned an invalid address") from error
        if not address.is_global:
            raise UnsafeSourceUrlError(
                f"DNS for {hostname} returned a non-global address"
            )
    if checked == 0:
        raise UnsafeSourceUrlError("DNS returned no addresses")
