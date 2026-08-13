from __future__ import annotations

from typing import Protocol, runtime_checkable

from .errors import ProviderNotConfiguredError
from .models import AcquiredMedia, OcrSegment, ResolvedSource, TimedTextSegment


@runtime_checkable
class SpeechToTextProvider(Protocol):
    name: str

    async def transcribe(
        self, media: AcquiredMedia
    ) -> tuple[TimedTextSegment, ...]: ...


@runtime_checkable
class OcrProvider(Protocol):
    name: str

    async def recognize(self, media: AcquiredMedia) -> tuple[OcrSegment, ...]: ...


@runtime_checkable
class RecipeExtractionProvider(Protocol):
    name: str

    async def extract(
        self,
        source: ResolvedSource,
        transcript: tuple[TimedTextSegment, ...],
        ocr: tuple[OcrSegment, ...],
    ) -> dict[str, object]: ...


@runtime_checkable
class TranslationProvider(Protocol):
    name: str

    async def translate(
        self, text: str, source_locale: str, target_locale: str
    ) -> str: ...


class NotConfiguredSpeechToTextProvider:
    def __init__(self, name: str = "not-configured") -> None:
        self.name = name

    async def transcribe(
        self, media: AcquiredMedia
    ) -> tuple[TimedTextSegment, ...]:
        del media
        raise ProviderNotConfiguredError("speech-to-text", self.name)


class NotConfiguredOcrProvider:
    def __init__(self, name: str = "not-configured") -> None:
        self.name = name

    async def recognize(self, media: AcquiredMedia) -> tuple[OcrSegment, ...]:
        del media
        raise ProviderNotConfiguredError("OCR", self.name)


class NotConfiguredRecipeExtractionProvider:
    def __init__(self, name: str = "not-configured") -> None:
        self.name = name

    async def extract(
        self,
        source: ResolvedSource,
        transcript: tuple[TimedTextSegment, ...],
        ocr: tuple[OcrSegment, ...],
    ) -> dict[str, object]:
        del source, transcript, ocr
        raise ProviderNotConfiguredError("recipe extraction", self.name)


class NotConfiguredTranslationProvider:
    def __init__(self, name: str = "not-configured") -> None:
        self.name = name

    async def translate(
        self, text: str, source_locale: str, target_locale: str
    ) -> str:
        del text, source_locale, target_locale
        raise ProviderNotConfiguredError("translation", self.name)


class FixtureProvider:
    """
    Explicit offline provider used only for `fixture://` jobs.

    It never claims to have downloaded platform media. Results are stable,
    source-faithful fixture data with unknown quantities kept null.
    """

    name = "fixture"

    @staticmethod
    def _require_fixture(media: AcquiredMedia) -> None:
        if not media.fixture:
            raise ProviderNotConfiguredError(
                "fixture provider for non-fixture media", "fixture"
            )

    async def transcribe(
        self, media: AcquiredMedia
    ) -> tuple[TimedTextSegment, ...]:
        self._require_fixture(media)
        return (
            TimedTextSegment(
                start_seconds=3.0,
                end_seconds=8.0,
                text="两个番茄切块",
                language="zh-CN",
                confidence=0.99,
            ),
            TimedTextSegment(
                start_seconds=10.0,
                end_seconds=27.0,
                text="三个鸡蛋打散，炒到刚凝固就盛出",
                language="zh-CN",
                confidence=0.97,
            ),
            TimedTextSegment(
                start_seconds=29.0,
                end_seconds=40.0,
                text="番茄炒软，倒回鸡蛋，最后加盐调味",
                language="zh-CN",
                confidence=0.98,
            ),
        )

    async def recognize(self, media: AcquiredMedia) -> tuple[OcrSegment, ...]:
        self._require_fixture(media)
        return (
            OcrSegment(
                timestamp_seconds=4.0,
                text="番茄 2个 / 鸡蛋 3个",
                language="zh-CN",
                bbox=(110.0, 70.0, 520.0, 95.0),
                confidence=0.96,
            ),
        )

    async def extract(
        self,
        source: ResolvedSource,
        transcript: tuple[TimedTextSegment, ...],
        ocr: tuple[OcrSegment, ...],
    ) -> dict[str, object]:
        if source.platform.value != "fixture":
            raise ProviderNotConfiguredError(
                "fixture extraction for non-fixture source", "fixture"
            )
        if not transcript or not ocr:
            raise ValueError("fixture extraction expects fixture transcript and OCR")
        return {
            "schemaVersion": 1,
            "fixture": True,
            "title": {
                "original": "家常番茄炒蛋",
                "originalLocale": "zh-CN",
                "zhCN": "家常番茄炒蛋",
                "enUS": "Home-style tomato and eggs",
            },
            "ingredients": [
                {"name": "番茄", "quantity": 2, "unit": "个"},
                {"name": "鸡蛋", "quantity": 3, "unit": "个"},
                {
                    "name": "盐",
                    "quantity": None,
                    "originalQuantityText": "适量",
                },
            ],
            "steps": [
                {
                    "instruction": "番茄切块，鸡蛋打散。",
                    "startSeconds": 3,
                    "endSeconds": 15,
                },
                {
                    "instruction": "炒鸡蛋至刚凝固后盛出。",
                    "startSeconds": 17,
                    "endSeconds": 28,
                },
                {
                    "instruction": "炒软番茄，倒回鸡蛋，加盐翻匀。",
                    "startSeconds": 29,
                    "endSeconds": 42,
                },
            ],
        }

    async def translate(
        self, text: str, source_locale: str, target_locale: str
    ) -> str:
        translations = {
            ("家常番茄炒蛋", "zh-CN", "en-US"): "Home-style tomato and eggs",
            ("Home-style tomato and eggs", "en-US", "zh-CN"): "家常番茄炒蛋",
        }
        result = translations.get((text, source_locale, target_locale))
        if result is None:
            raise ProviderNotConfiguredError(
                "unregistered fixture translation", "fixture"
            )
        return result


class ProviderSet:
    def __init__(
        self,
        speech_to_text: SpeechToTextProvider,
        ocr: OcrProvider,
        extraction: RecipeExtractionProvider,
        translation: TranslationProvider,
    ) -> None:
        self.speech_to_text = speech_to_text
        self.ocr = ocr
        self.extraction = extraction
        self.translation = translation

    @classmethod
    def unconfigured(
        cls,
        *,
        asr_name: str = "not-configured",
        ocr_name: str = "not-configured",
        extraction_name: str = "not-configured",
        translation_name: str = "not-configured",
    ) -> ProviderSet:
        return cls(
            speech_to_text=NotConfiguredSpeechToTextProvider(asr_name),
            ocr=NotConfiguredOcrProvider(ocr_name),
            extraction=NotConfiguredRecipeExtractionProvider(extraction_name),
            translation=NotConfiguredTranslationProvider(translation_name),
        )

    @classmethod
    def fixture(cls) -> ProviderSet:
        fixture = FixtureProvider()
        return cls(fixture, fixture, fixture, fixture)
