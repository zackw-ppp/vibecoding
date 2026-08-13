import {
  BoundingBoxSchema,
  LocalizedTextSchema,
  MediaAssetReferenceSchema,
  RecipeSchema,
  ReviewIssueSchema,
} from "@mise/recipe-domain";
import { z } from "zod";

const nonBlankText = z.string().trim().min(1);
const timestamp = z.string().datetime({ offset: true });
const seconds = z.number().finite().nonnegative();

export const PlatformSchema = z.enum([
  "youtube",
  "bilibili",
  "tiktok",
  "xiaohongshu",
  "douyin",
  "local",
  "fixture",
]);
export type Platform = z.infer<typeof PlatformSchema>;

export const SourceContentTypeSchema = z.enum([
  "video",
  "image_post",
  "local_video",
  "local_images",
  "text",
  "fixture",
]);
export type SourceContentType = z.infer<typeof SourceContentTypeSchema>;

export const SourceReferenceSchema = z
  .object({
    id: z.string().uuid(),
    platform: PlatformSchema,
    contentType: SourceContentTypeSchema,
    originalUrl: z.string().url().nullable(),
    canonicalUrl: z.string().url().nullable(),
    platformPostId: nonBlankText.max(512).nullable(),
    authorName: nonBlankText.max(500).nullable(),
    authorUrl: z.string().url().nullable(),
    title: LocalizedTextSchema.nullable(),
    sourceLanguage: nonBlankText.max(35).nullable(),
    publishedAt: timestamp.nullable(),
    importedAt: timestamp,
    metadata: z.record(z.string(), z.unknown()),
  })
  .strict()
  .superRefine((source, context) => {
    const remote = !["local", "fixture"].includes(source.platform);
    if (
      remote &&
      (source.originalUrl === null || source.canonicalUrl === null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["canonicalUrl"],
        message: "remote sources require original and canonical URLs",
      });
    }
  });
export type SourceReference = z.infer<typeof SourceReferenceSchema>;

export const TimedTextSegmentSchema = z
  .object({
    id: z.string().uuid(),
    startSeconds: seconds,
    endSeconds: seconds,
    text: nonBlankText.max(100_000),
    language: nonBlankText.max(35),
    confidence: z.number().finite().min(0).max(1).nullable(),
  })
  .strict()
  .refine((segment) => segment.endSeconds >= segment.startSeconds, {
    path: ["endSeconds"],
    message: "endSeconds must be greater than or equal to startSeconds",
  });
export type TimedTextSegment = z.infer<typeof TimedTextSegmentSchema>;

export const OcrSegmentSchema = z
  .object({
    id: z.string().uuid(),
    timestampSeconds: seconds,
    text: nonBlankText.max(100_000),
    language: nonBlankText.max(35),
    confidence: z.number().finite().min(0).max(1).nullable(),
    bbox: BoundingBoxSchema,
    keyframeAssetId: z.string().uuid(),
  })
  .strict();
export type OcrSegment = z.infer<typeof OcrSegmentSchema>;

export const VisualObservationSchema = z
  .object({
    id: z.string().uuid(),
    startSeconds: seconds,
    endSeconds: seconds,
    observation: LocalizedTextSchema,
    confidence: z.number().finite().min(0).max(1).nullable(),
    keyframeAssetIds: z.array(z.string().uuid()).max(25),
  })
  .strict()
  .refine((segment) => segment.endSeconds >= segment.startSeconds, {
    path: ["endSeconds"],
    message: "endSeconds must be greater than or equal to startSeconds",
  });
export type VisualObservation = z.infer<typeof VisualObservationSchema>;

/**
 * A SourceBundle contains source and derived references only. Raw downloaded
 * media is intentionally absent because full source media is ephemeral.
 */
export const SourceBundleSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: SourceReferenceSchema,
    postText: LocalizedTextSchema.nullable(),
    nativeCaptions: z.array(TimedTextSegmentSchema).max(100_000),
    asrTranscript: z.array(TimedTextSegmentSchema).max(100_000),
    ocrSegments: z.array(OcrSegmentSchema).max(100_000),
    visualObservations: z.array(VisualObservationSchema).max(25_000),
    sourceImages: z.array(MediaAssetReferenceSchema).max(500),
    keyframes: z.array(MediaAssetReferenceSchema).max(10_000),
    reviewProxy: MediaAssetReferenceSchema.nullable(),
    generatedAt: timestamp,
  })
  .strict()
  .superRefine((bundle, context) => {
    if (
      bundle.reviewProxy !== null &&
      bundle.reviewProxy.kind !== "review_proxy"
    ) {
      context.addIssue({
        code: "custom",
        path: ["reviewProxy", "kind"],
        message: "reviewProxy must reference a review_proxy asset",
      });
    }
    bundle.sourceImages.forEach((asset, index) => {
      if (asset.kind !== "source_image") {
        context.addIssue({
          code: "custom",
          path: ["sourceImages", index, "kind"],
          message: "sourceImages may only contain source_image assets",
        });
      }
    });
    bundle.keyframes.forEach((asset, index) => {
      if (asset.kind !== "keyframe") {
        context.addIssue({
          code: "custom",
          path: ["keyframes", index, "kind"],
          message: "keyframes may only contain keyframe assets",
        });
      }
    });
  });
export type SourceBundle = z.infer<typeof SourceBundleSchema>;

export const ImportSourceTypeSchema = z.enum([
  "url",
  "upload",
  "images",
  "text",
  "fixture",
]);
export type ImportSourceType = z.infer<typeof ImportSourceTypeSchema>;

export const ImportJobStatusSchema = z.enum([
  "queued",
  "resolving_source",
  "downloading_media",
  "extracting_metadata",
  "extracting_captions",
  "transcribing",
  "sampling_frames",
  "running_ocr",
  "structuring_recipe",
  "aligning_evidence",
  "rendering_step_clips",
  "uploading_assets",
  "needs_review",
  "complete",
  "partial_failure",
  "failed",
  "cancelled",
  "stalled",
]);
export type ImportJobStatus = z.infer<typeof ImportJobStatusSchema>;

export const STANDARD_ERROR_CODES = [
  "UNSUPPORTED_URL",
  "SOURCE_UNAVAILABLE",
  "AUTH_REQUIRED",
  "REGION_RESTRICTED",
  "MEDIA_DOWNLOAD_FAILED",
  "UNSUPPORTED_CODEC",
  "UPLOAD_INTERRUPTED",
  "CAPTION_EXTRACTION_FAILED",
  "TRANSCRIPTION_FAILED",
  "OCR_FAILED",
  "NO_RECIPE_DETECTED",
  "MULTIPLE_RECIPES_DETECTED",
  "MODEL_INVALID_OUTPUT",
  "EVIDENCE_ALIGNMENT_FAILED",
  "CLIP_RENDER_FAILED",
  "STORAGE_QUOTA_EXCEEDED",
  "JOB_TIMEOUT",
  "JOB_CANCELLED",
  "UNKNOWN_ERROR",
  "INVALID_INPUT",
  "UNAUTHORIZED",
  "RATE_LIMITED",
  "REVISION_CONFLICT",
  "PROVIDER_NOT_CONFIGURED",
  "TEMP_STORAGE_LIMIT",
] as const;

export const StandardErrorCodeSchema = z.enum(STANDARD_ERROR_CODES);
export type StandardErrorCode = z.infer<typeof StandardErrorCodeSchema>;

export interface ErrorCopy {
  readonly messageKey: `error.${Lowercase<StandardErrorCode>}`;
  readonly zhCN: string;
  readonly enUS: string;
  readonly retryable: boolean;
}

export const ERROR_CATALOG: Readonly<Record<StandardErrorCode, ErrorCopy>> =
  Object.freeze({
    UNSUPPORTED_URL: {
      messageKey: "error.unsupported_url",
      zhCN: "暂不支持此链接。",
      enUS: "This URL is not supported.",
      retryable: false,
    },
    SOURCE_UNAVAILABLE: {
      messageKey: "error.source_unavailable",
      zhCN: "来源内容当前不可用。",
      enUS: "The source is currently unavailable.",
      retryable: true,
    },
    AUTH_REQUIRED: {
      messageKey: "error.auth_required",
      zhCN: "来源需要登录，无法导入。",
      enUS: "The source requires authentication and cannot be imported.",
      retryable: false,
    },
    REGION_RESTRICTED: {
      messageKey: "error.region_restricted",
      zhCN: "来源在当前地区不可用。",
      enUS: "The source is unavailable in this region.",
      retryable: false,
    },
    MEDIA_DOWNLOAD_FAILED: {
      messageKey: "error.media_download_failed",
      zhCN: "临时获取媒体失败。",
      enUS: "Temporary media acquisition failed.",
      retryable: true,
    },
    UNSUPPORTED_CODEC: {
      messageKey: "error.unsupported_codec",
      zhCN: "媒体编码暂不支持。",
      enUS: "The media codec is not supported.",
      retryable: false,
    },
    UPLOAD_INTERRUPTED: {
      messageKey: "error.upload_interrupted",
      zhCN: "上传已中断。",
      enUS: "The upload was interrupted.",
      retryable: true,
    },
    CAPTION_EXTRACTION_FAILED: {
      messageKey: "error.caption_extraction_failed",
      zhCN: "字幕提取失败。",
      enUS: "Caption extraction failed.",
      retryable: true,
    },
    TRANSCRIPTION_FAILED: {
      messageKey: "error.transcription_failed",
      zhCN: "语音转写失败。",
      enUS: "Speech transcription failed.",
      retryable: true,
    },
    OCR_FAILED: {
      messageKey: "error.ocr_failed",
      zhCN: "画面文字识别失败。",
      enUS: "On-screen text recognition failed.",
      retryable: true,
    },
    NO_RECIPE_DETECTED: {
      messageKey: "error.no_recipe_detected",
      zhCN: "没有识别到可用食谱。",
      enUS: "No usable recipe was detected.",
      retryable: false,
    },
    MULTIPLE_RECIPES_DETECTED: {
      messageKey: "error.multiple_recipes_detected",
      zhCN: "检测到多份食谱，需要选择。",
      enUS: "Multiple recipes were detected and need review.",
      retryable: false,
    },
    MODEL_INVALID_OUTPUT: {
      messageKey: "error.model_invalid_output",
      zhCN: "结构化结果未通过验证。",
      enUS: "The structured result failed validation.",
      retryable: true,
    },
    EVIDENCE_ALIGNMENT_FAILED: {
      messageKey: "error.evidence_alignment_failed",
      zhCN: "步骤与来源证据对齐失败。",
      enUS: "Step-to-source evidence alignment failed.",
      retryable: true,
    },
    CLIP_RENDER_FAILED: {
      messageKey: "error.clip_render_failed",
      zhCN: "步骤短片生成失败。",
      enUS: "Step clip rendering failed.",
      retryable: true,
    },
    STORAGE_QUOTA_EXCEEDED: {
      messageKey: "error.storage_quota_exceeded",
      zhCN: "存储空间不足。",
      enUS: "Storage quota was exceeded.",
      retryable: false,
    },
    JOB_TIMEOUT: {
      messageKey: "error.job_timeout",
      zhCN: "任务处理超时。",
      enUS: "The import job timed out.",
      retryable: true,
    },
    JOB_CANCELLED: {
      messageKey: "error.job_cancelled",
      zhCN: "任务已取消。",
      enUS: "The import job was cancelled.",
      retryable: false,
    },
    UNKNOWN_ERROR: {
      messageKey: "error.unknown_error",
      zhCN: "发生未知错误。",
      enUS: "An unknown error occurred.",
      retryable: true,
    },
    INVALID_INPUT: {
      messageKey: "error.invalid_input",
      zhCN: "输入内容无效。",
      enUS: "The input is invalid.",
      retryable: false,
    },
    UNAUTHORIZED: {
      messageKey: "error.unauthorized",
      zhCN: "需要登录后继续。",
      enUS: "Authentication is required.",
      retryable: false,
    },
    RATE_LIMITED: {
      messageKey: "error.rate_limited",
      zhCN: "请求过于频繁，请稍后重试。",
      enUS: "Too many requests. Try again later.",
      retryable: true,
    },
    REVISION_CONFLICT: {
      messageKey: "error.revision_conflict",
      zhCN: "云端食谱已更新，请先比较版本。",
      enUS: "The cloud recipe changed. Compare versions before saving.",
      retryable: false,
    },
    PROVIDER_NOT_CONFIGURED: {
      messageKey: "error.provider_not_configured",
      zhCN: "此处理能力尚未配置。",
      enUS: "This processing provider is not configured.",
      retryable: false,
    },
    TEMP_STORAGE_LIMIT: {
      messageKey: "error.temp_storage_limit",
      zhCN: "临时处理空间不足。",
      enUS: "Temporary processing storage is full.",
      retryable: true,
    },
  });

export const JobErrorSchema = z
  .object({
    code: StandardErrorCodeSchema,
    messageKey: nonBlankText.max(200),
    userMessage: z
      .object({
        zhCN: nonBlankText.max(2_000),
        enUS: nonBlankText.max(2_000),
      })
      .strict(),
    retryable: z.boolean(),
    debugReference: nonBlankText.max(256).nullable(),
    debugDetails: z.string().max(2_000).nullable(),
  })
  .strict()
  .superRefine((error, context) => {
    const standard = ERROR_CATALOG[error.code];
    if (error.messageKey !== standard.messageKey) {
      context.addIssue({
        code: "custom",
        path: ["messageKey"],
        message: `messageKey must be ${standard.messageKey}`,
      });
    }
    if (error.retryable !== standard.retryable) {
      context.addIssue({
        code: "custom",
        path: ["retryable"],
        message: "retryable must match the standardized error catalog",
      });
    }
  });
export type JobError = z.infer<typeof JobErrorSchema>;

export const ImportJobSchema = z
  .object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
    sourceType: ImportSourceTypeSchema,
    platform: PlatformSchema.nullable(),
    originalSourceUrl: z.string().url().nullable(),
    sourceUrl: z.string().url().nullable(),
    uploadId: nonBlankText.max(512).nullable(),
    status: ImportJobStatusSchema,
    currentStage: ImportJobStatusSchema,
    progress: z.number().int().min(0).max(100),
    retryCount: z.number().int().nonnegative(),
    cancelRequestedAt: timestamp.nullable(),
    heartbeatAt: timestamp.nullable(),
    error: JobErrorSchema.nullable(),
    resultRecipeId: z.string().uuid().nullable(),
    claimedBy: nonBlankText.max(200).nullable(),
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: timestamp.nullable(),
  })
  .strict()
  .superRefine((job, context) => {
    const terminal = ["complete", "partial_failure", "failed", "cancelled"];
    if (terminal.includes(job.status) !== (job.completedAt !== null)) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "terminal jobs require completedAt; active jobs must omit it",
      });
    }
    if (job.status === "complete" && job.resultRecipeId === null) {
      context.addIssue({
        code: "custom",
        path: ["resultRecipeId"],
        message: "complete jobs require a result recipe",
      });
    }
    if (
      ["failed", "partial_failure"].includes(job.status) &&
      job.error === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["error"],
        message: "failed jobs require a standardized error",
      });
    }
    if (
      job.sourceType === "url" &&
      (job.originalSourceUrl === null ||
        job.sourceUrl === null ||
        job.platform === null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["sourceUrl"],
        message: "URL imports require original/canonical URLs and a platform",
      });
    }
    if (
      ["upload", "images"].includes(job.sourceType) &&
      job.uploadId === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["uploadId"],
        message: "upload and image imports require an uploadId",
      });
    }
    if (job.sourceType === "fixture" && job.platform !== "fixture") {
      context.addIssue({
        code: "custom",
        path: ["platform"],
        message: "fixture imports must use the fixture platform",
      });
    }
  });
export type ImportJob = z.infer<typeof ImportJobSchema>;

const processingOrder: readonly ImportJobStatus[] = [
  "queued",
  "resolving_source",
  "downloading_media",
  "extracting_metadata",
  "extracting_captions",
  "transcribing",
  "sampling_frames",
  "running_ocr",
  "structuring_recipe",
  "aligning_evidence",
  "rendering_step_clips",
  "uploading_assets",
  "needs_review",
  "complete",
];

const transitionMap = new Map<ImportJobStatus, ReadonlySet<ImportJobStatus>>();
for (let index = 0; index < processingOrder.length; index += 1) {
  const state = processingOrder[index];
  if (state === undefined) continue;
  const next = processingOrder[index + 1];
  const transitions = new Set<ImportJobStatus>();
  if (next !== undefined) transitions.add(next);
  if (!["needs_review", "complete"].includes(state)) {
    transitions.add("partial_failure");
    transitions.add("failed");
    transitions.add("cancelled");
    transitions.add("stalled");
  }
  transitionMap.set(state, transitions);
}
transitionMap.set(
  "stalled",
  new Set(["queued", "resolving_source", "failed", "cancelled"]),
);
transitionMap.set("partial_failure", new Set(["queued", "needs_review"]));
transitionMap.set("failed", new Set(["queued"]));
transitionMap.set("cancelled", new Set());
transitionMap.set("complete", new Set());

export function canTransitionImportJob(
  from: ImportJobStatus,
  to: ImportJobStatus,
): boolean {
  return from === to || (transitionMap.get(from)?.has(to) ?? false);
}

export class InvalidJobTransitionError extends Error {
  readonly from: ImportJobStatus;
  readonly to: ImportJobStatus;

  constructor(from: ImportJobStatus, to: ImportJobStatus) {
    super(`Invalid import job transition: ${from} -> ${to}`);
    this.name = "InvalidJobTransitionError";
    this.from = from;
    this.to = to;
  }
}

export function assertImportJobTransition(
  from: ImportJobStatus,
  to: ImportJobStatus,
): void {
  if (!canTransitionImportJob(from, to)) {
    throw new InvalidJobTransitionError(from, to);
  }
}

export const ImportResultSchema = z
  .object({
    sourceBundle: SourceBundleSchema,
    recipe: RecipeSchema,
    reviewIssues: z.array(ReviewIssueSchema).max(10_000),
  })
  .strict();
export type ImportResult = z.infer<typeof ImportResultSchema>;

const TRACKING_PARAMETERS = new Set([
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
]);

interface HostRule {
  readonly platform: Exclude<Platform, "local" | "fixture">;
  readonly canonicalHost: string;
  readonly shortLink: boolean;
  readonly validPath: (url: URL) => boolean;
}

const contentId = "[A-Za-z0-9_-]+";
const HOST_RULES: Readonly<Record<string, HostRule>> = {
  "youtube.com": {
    platform: "youtube",
    canonicalHost: "youtube.com",
    shortLink: false,
    validPath: (url) =>
      (url.pathname === "/watch" && Boolean(url.searchParams.get("v"))) ||
      new RegExp(`^/(shorts|live)/${contentId}/?$`).test(url.pathname),
  },
  "www.youtube.com": {
    platform: "youtube",
    canonicalHost: "youtube.com",
    shortLink: false,
    validPath: (url) =>
      (url.pathname === "/watch" && Boolean(url.searchParams.get("v"))) ||
      new RegExp(`^/(shorts|live)/${contentId}/?$`).test(url.pathname),
  },
  "m.youtube.com": {
    platform: "youtube",
    canonicalHost: "youtube.com",
    shortLink: false,
    validPath: (url) =>
      (url.pathname === "/watch" && Boolean(url.searchParams.get("v"))) ||
      new RegExp(`^/(shorts|live)/${contentId}/?$`).test(url.pathname),
  },
  "youtu.be": {
    platform: "youtube",
    canonicalHost: "youtu.be",
    shortLink: true,
    validPath: (url) => new RegExp(`^/${contentId}/?$`).test(url.pathname),
  },
  "bilibili.com": {
    platform: "bilibili",
    canonicalHost: "bilibili.com",
    shortLink: false,
    validPath: (url) =>
      /^\/video\/(BV[A-Za-z0-9]+|av[0-9]+)\/?$/.test(url.pathname),
  },
  "www.bilibili.com": {
    platform: "bilibili",
    canonicalHost: "bilibili.com",
    shortLink: false,
    validPath: (url) =>
      /^\/video\/(BV[A-Za-z0-9]+|av[0-9]+)\/?$/.test(url.pathname),
  },
  "m.bilibili.com": {
    platform: "bilibili",
    canonicalHost: "bilibili.com",
    shortLink: false,
    validPath: (url) =>
      /^\/video\/(BV[A-Za-z0-9]+|av[0-9]+)\/?$/.test(url.pathname),
  },
  "b23.tv": {
    platform: "bilibili",
    canonicalHost: "b23.tv",
    shortLink: true,
    validPath: (url) => new RegExp(`^/${contentId}/?$`).test(url.pathname),
  },
  "tiktok.com": {
    platform: "tiktok",
    canonicalHost: "tiktok.com",
    shortLink: false,
    validPath: (url) =>
      /^\/@[^/]+\/(video|photo)\/[0-9]+\/?$/.test(url.pathname),
  },
  "www.tiktok.com": {
    platform: "tiktok",
    canonicalHost: "tiktok.com",
    shortLink: false,
    validPath: (url) =>
      /^\/@[^/]+\/(video|photo)\/[0-9]+\/?$/.test(url.pathname),
  },
  "m.tiktok.com": {
    platform: "tiktok",
    canonicalHost: "tiktok.com",
    shortLink: false,
    validPath: (url) =>
      /^\/@[^/]+\/(video|photo)\/[0-9]+\/?$/.test(url.pathname),
  },
  "vm.tiktok.com": {
    platform: "tiktok",
    canonicalHost: "vm.tiktok.com",
    shortLink: true,
    validPath: (url) => new RegExp(`^/${contentId}/?$`).test(url.pathname),
  },
  "vt.tiktok.com": {
    platform: "tiktok",
    canonicalHost: "vt.tiktok.com",
    shortLink: true,
    validPath: (url) => new RegExp(`^/${contentId}/?$`).test(url.pathname),
  },
  "xiaohongshu.com": {
    platform: "xiaohongshu",
    canonicalHost: "xiaohongshu.com",
    shortLink: false,
    validPath: (url) =>
      new RegExp(`^/(explore|discovery/item)/${contentId}/?$`).test(
        url.pathname,
      ),
  },
  "www.xiaohongshu.com": {
    platform: "xiaohongshu",
    canonicalHost: "xiaohongshu.com",
    shortLink: false,
    validPath: (url) =>
      new RegExp(`^/(explore|discovery/item)/${contentId}/?$`).test(
        url.pathname,
      ),
  },
  "xhslink.com": {
    platform: "xiaohongshu",
    canonicalHost: "xhslink.com",
    shortLink: true,
    validPath: (url) => new RegExp(`^/[A-Za-z0-9]+/?$`).test(url.pathname),
  },
  "douyin.com": {
    platform: "douyin",
    canonicalHost: "douyin.com",
    shortLink: false,
    validPath: (url) => /^\/video\/[0-9]+\/?$/.test(url.pathname),
  },
  "www.douyin.com": {
    platform: "douyin",
    canonicalHost: "douyin.com",
    shortLink: false,
    validPath: (url) => /^\/video\/[0-9]+\/?$/.test(url.pathname),
  },
  "v.douyin.com": {
    platform: "douyin",
    canonicalHost: "v.douyin.com",
    shortLink: true,
    validPath: (url) => new RegExp(`^/${contentId}/?$`).test(url.pathname),
  },
};

export interface NormalizedSourceUrl {
  readonly originalUrl: string;
  readonly canonicalUrl: string;
  readonly platform: Exclude<Platform, "local" | "fixture">;
  /**
   * Redirects must be resolved by the worker with redirect-by-redirect
   * allowlist and DNS/IP checks. Edge/client normalization does no network IO.
   */
  readonly requiresRedirectResolution: boolean;
}

export class UrlValidationError extends Error {
  readonly code = "UNSUPPORTED_URL" as const;

  constructor(message: string) {
    super(message);
    this.name = "UrlValidationError";
  }
}

export function normalizeSupportedUrl(input: string): NormalizedSourceUrl {
  const originalUrl = input.trim();
  if (originalUrl.length === 0 || originalUrl.length > 2_048) {
    throw new UrlValidationError("URL length is invalid");
  }
  if (originalUrl.includes("\\")) {
    throw new UrlValidationError("Backslashes are not allowed in source URLs");
  }

  let url: URL;
  try {
    url = new URL(originalUrl);
  } catch {
    throw new UrlValidationError("URL is malformed");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new UrlValidationError("Only HTTP(S) source URLs are supported");
  }
  if (url.username !== "" || url.password !== "" || url.port !== "") {
    throw new UrlValidationError(
      "Credentials and explicit ports are not allowed in source URLs",
    );
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const rule = HOST_RULES[hostname];
  if (rule === undefined) {
    throw new UrlValidationError("Source host is not allowlisted");
  }
  if (!rule.validPath(url)) {
    throw new UrlValidationError("URL is not a supported public post URL");
  }

  for (const parameter of [...url.searchParams.keys()]) {
    if (
      parameter.toLowerCase().startsWith("utm_") ||
      TRACKING_PARAMETERS.has(parameter.toLowerCase())
    ) {
      url.searchParams.delete(parameter);
    }
  }
  url.searchParams.sort();
  url.protocol = "https:";
  url.hostname = rule.canonicalHost;
  url.hash = "";
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return {
    originalUrl,
    canonicalUrl: url.toString(),
    platform: rule.platform,
    requiresRedirectResolution: rule.shortLink,
  };
}

export function detectPlatform(
  input: string,
): Exclude<Platform, "local" | "fixture"> {
  return normalizeSupportedUrl(input).platform;
}

const SENSITIVE_DEBUG_PATTERN =
  /(authorization|bearer|cookie|set-cookie|api[_-]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi;

export function redactDebugDetails(details: string): string {
  return details
    .replace(SENSITIVE_DEBUG_PATTERN, "$1=[REDACTED]")
    .slice(0, 2_000);
}
