import {
  HttpError,
  assertAllowedOrigin,
  authenticate,
  errorResponse,
  handlePreflight,
  jsonResponse,
  parseJson,
  z,
} from "../_shared/http.ts";
import { normalizeSourceUrl } from "../_shared/source-url.ts";

const common = {
  preferredLocale: z.enum(["zh-CN", "en-US"]).default("zh-CN"),
  unitSystem: z.enum(["source", "metric", "imperial"]).default("source"),
};

const createImportJobInput = z.discriminatedUnion("sourceType", [
  z
    .object({
      sourceType: z.literal("url"),
      sourceUrl: z.string().trim().min(1).max(2_048),
      ...common,
    })
    .strict(),
  z
    .object({
      sourceType: z.literal("upload"),
      uploadId: z.string().uuid(),
      ...common,
    })
    .strict(),
  z
    .object({
      sourceType: z.literal("images"),
      uploadId: z.string().uuid(),
      ...common,
    })
    .strict(),
  z
    .object({
      sourceType: z.literal("text"),
      sourceText: z.string().trim().min(1).max(100_000),
      ...common,
    })
    .strict(),
  z
    .object({
      sourceType: z.literal("fixture"),
      fixtureId: z.enum([
        "zh-short-ocr-led",
        "zh-short-narration-led",
        "en-tiktok-style",
        "xiaohongshu-image-post",
        "missing-quantities",
        "multiple-recipes",
        "rapid-cuts-repeated-scenes",
        "long-form-video",
      ]),
      ...common,
    })
    .strict(),
]);

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;

  try {
    assertAllowedOrigin(request);
    if (request.method !== "POST") {
      throw new HttpError(405, "METHOD_NOT_ALLOWED", "Use POST");
    }

    const { user, admin } = await authenticate(request);
    const parsed = createImportJobInput.safeParse(await parseJson(request));
    if (!parsed.success) {
      throw new HttpError(
        400,
        "INVALID_INPUT",
        parsed.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
          .join("; "),
      );
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1_000).toISOString();
    const { count, error: countError } = await admin
      .from("import_jobs")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .gte("created_at", oneHourAgo);
    if (countError) {
      throw new HttpError(
        500,
        "DATABASE_ERROR",
        "Could not check import limits",
        false,
      );
    }
    const configuredLimit = Number(
      Deno.env.get("CREATE_IMPORT_RATE_LIMIT_PER_HOUR") ?? "20",
    );
    const rateLimit =
      Number.isSafeInteger(configuredLimit) && configuredLimit > 0
        ? configuredLimit
        : 20;
    if ((count ?? 0) >= rateLimit) {
      throw new HttpError(
        429,
        "RATE_LIMITED",
        "Too many import jobs. Try again later.",
      );
    }

    const input = parsed.data;
    let platform: string | null = null;
    let sourceOriginalUrl: string | null = null;
    let sourceUrl: string | null = null;
    let uploadId: string | null = null;
    let fixtureId: string | null = null;
    let inputPayload: Record<string, unknown> = {};

    if (input.sourceType === "url") {
      const normalized = normalizeSourceUrl(input.sourceUrl);
      platform = normalized.platform;
      sourceOriginalUrl = normalized.originalUrl;
      sourceUrl = normalized.canonicalUrl;
      inputPayload = {
        requiresRedirectResolution: normalized.requiresRedirectResolution,
      };

      const { data: duplicate, error: duplicateError } = await admin
        .from("import_jobs")
        .select("id,status")
        .eq("owner_id", user.id)
        .eq("source_url", sourceUrl)
        .not("status", "in", "(failed,cancelled)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (duplicateError) {
        throw new HttpError(
          500,
          "DATABASE_ERROR",
          "Could not check for duplicate imports",
          false,
        );
      }
      if (duplicate) {
        return jsonResponse(request, 409, {
          error: {
            code: "DUPLICATE_IMPORT",
            message: "This source already has an active or completed import.",
            existingJobId: duplicate.id,
            existingStatus: duplicate.status,
          },
        });
      }
    } else if (
      input.sourceType === "upload" ||
      input.sourceType === "images"
    ) {
      uploadId = input.uploadId;
    } else if (input.sourceType === "text") {
      inputPayload = { text: input.sourceText };
    } else {
      platform = "fixture";
      fixtureId = input.fixtureId;
      sourceOriginalUrl = `fixture://scenarios/${input.fixtureId}`;
      sourceUrl = sourceOriginalUrl;
      inputPayload = { fixture: true };
    }

    const { data: job, error: insertError } = await admin
      .from("import_jobs")
      .insert({
        owner_id: user.id,
        source_type: input.sourceType,
        platform,
        source_original_url: sourceOriginalUrl,
        source_url: sourceUrl,
        upload_id: uploadId,
        fixture_id: fixtureId,
        preferred_locale: input.preferredLocale,
        unit_system: input.unitSystem,
        input_payload: inputPayload,
        status: "queued",
        current_stage: "queued",
        progress: 0,
      })
      .select("id,status,created_at")
      .single();
    if (insertError || !job) {
      throw new HttpError(
        500,
        "DATABASE_ERROR",
        "Could not create the import job",
        false,
      );
    }

    return jsonResponse(
      request,
      201,
      {
        jobId: job.id,
        status: job.status,
        createdAt: job.created_at,
      },
      { location: `/import/${job.id}` },
    );
  } catch (error) {
    return errorResponse(request, error);
  }
});
