import { describe, expect, it } from "vitest";

import {
  ERROR_CATALOG,
  ImportJobStatusSchema,
  JobErrorSchema,
  SourceBundleSchema,
  STANDARD_ERROR_CODES,
  TimedTextSegmentSchema,
  UrlValidationError,
  assertImportJobTransition,
  canTransitionImportJob,
  normalizeSupportedUrl,
  redactDebugDetails,
} from "../src/index";

describe("supported URL normalization", () => {
  it.each([
    [
      "https://www.youtube.com/watch?v=abc_123&utm_source=test&si=secret",
      "youtube",
      "https://youtube.com/watch?v=abc_123",
    ],
    [
      "http://www.bilibili.com/video/BV1xx411c7mD/?spm_id_from=333",
      "bilibili",
      "https://bilibili.com/video/BV1xx411c7mD",
    ],
    [
      "https://www.tiktok.com/@cook/video/741234567890?utm_medium=share",
      "tiktok",
      "https://tiktok.com/@cook/video/741234567890",
    ],
    [
      "https://www.xiaohongshu.com/explore/66aBcD123?share_token=sensitive",
      "xiaohongshu",
      "https://xiaohongshu.com/explore/66aBcD123",
    ],
    [
      "https://www.douyin.com/video/741234567890?previous_page=web_code_link",
      "douyin",
      "https://douyin.com/video/741234567890?previous_page=web_code_link",
    ],
    [
      "https://youtu.be/abc_123?si=share-token",
      "youtube",
      "https://youtu.be/abc_123",
    ],
  ])("normalizes %s", (input, platform, canonicalUrl) => {
    expect(normalizeSupportedUrl(input)).toMatchObject({
      platform,
      canonicalUrl,
    });
  });

  it("marks short links for server-side redirect validation", () => {
    expect(
      normalizeSupportedUrl("https://v.douyin.com/AbC123").requiresRedirectResolution,
    ).toBe(true);
  });

  it.each([
    "https://youtube.com.evil.example/watch?v=abc",
    "https://youtube.com:8443/watch?v=abc",
    "https://user:password@youtube.com/watch?v=abc",
    "https://youtube.com/redirect?q=http://169.254.169.254/",
    "file:///etc/passwd",
    "https://127.0.0.1/video/123",
  ])("rejects unsafe or unsupported URL %s", (input) => {
    expect(() => normalizeSupportedUrl(input)).toThrow(UrlValidationError);
  });
});

describe("source contracts", () => {
  it("requires ordered transcript timestamps", () => {
    expect(
      TimedTextSegmentSchema.safeParse({
        id: "00000000-0000-4000-8000-000000000001",
        startSeconds: 10,
        endSeconds: 9,
        text: "stir",
        language: "en-US",
        confidence: 0.9,
      }).success,
    ).toBe(false);
  });

  it("does not accept raw media in a source bundle", () => {
    const bundle = {
      schemaVersion: 1,
      source: {
        id: "00000000-0000-4000-8000-000000000001",
        platform: "youtube",
        contentType: "video",
        originalUrl: "https://youtube.com/watch?v=abc",
        canonicalUrl: "https://youtube.com/watch?v=abc",
        platformPostId: "abc",
        authorName: null,
        authorUrl: null,
        title: null,
        sourceLanguage: "en-US",
        publishedAt: null,
        importedAt: "2026-08-13T05:00:00Z",
        metadata: {},
      },
      postText: null,
      nativeCaptions: [],
      asrTranscript: [],
      ocrSegments: [],
      visualObservations: [],
      sourceImages: [],
      keyframes: [],
      reviewProxy: null,
      generatedAt: "2026-08-13T05:00:00Z",
      rawMedia: "must-not-persist.mp4",
    };
    expect(SourceBundleSchema.safeParse(bundle).success).toBe(false);
  });
});

describe("import job state machine and errors", () => {
  it("allows forward work, failure, cancellation, and stalled retry only", () => {
    expect(canTransitionImportJob("queued", "resolving_source")).toBe(true);
    expect(canTransitionImportJob("running_ocr", "failed")).toBe(true);
    expect(canTransitionImportJob("stalled", "queued")).toBe(true);
    expect(canTransitionImportJob("complete", "queued")).toBe(false);
    expect(() =>
      assertImportJobTransition("structuring_recipe", "downloading_media"),
    ).toThrow("Invalid import job transition");
  });

  it("has bilingual copy for every standardized error code", () => {
    expect(Object.keys(ERROR_CATALOG).sort()).toEqual(
      [...STANDARD_ERROR_CODES].sort(),
    );
    expect(ImportJobStatusSchema.parse("stalled")).toBe("stalled");
  });

  it("rejects error metadata that diverges from the standard catalog", () => {
    expect(
      JobErrorSchema.safeParse({
        code: "OCR_FAILED",
        messageKey: "error.transcription_failed",
        userMessage: {
          zhCN: "画面文字识别失败。",
          enUS: "On-screen text recognition failed.",
        },
        retryable: false,
        debugReference: null,
        debugDetails: null,
      }).success,
    ).toBe(false);
  });

  it("redacts common credentials from bounded debug text", () => {
    const redacted = redactDebugDetails(
      "Authorization: Bearer-abc cookie=session-value api_key=top-secret",
    );
    expect(redacted).not.toContain("session-value");
    expect(redacted).not.toContain("top-secret");
  });
});
