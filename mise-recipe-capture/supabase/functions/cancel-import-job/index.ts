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

const cancelInput = z
  .object({
    jobId: z.string().uuid(),
  })
  .strict();

const finishedStatuses = new Set([
  "complete",
  "partial_failure",
  "failed",
  "cancelled",
  "needs_review",
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
    const parsed = cancelInput.safeParse(await parseJson(request, 10_000));
    if (!parsed.success) {
      throw new HttpError(
        400,
        "INVALID_INPUT",
        parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      );
    }

    const { data: existing, error: lookupError } = await admin
      .from("import_jobs")
      .select("id,status,cancel_requested_at")
      .eq("id", parsed.data.jobId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (lookupError) {
      throw new HttpError(
        500,
        "DATABASE_ERROR",
        "Could not look up the import job",
        false,
      );
    }
    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Import job was not found");
    }
    if (existing.status === "cancelled") {
      return jsonResponse(request, 200, {
        jobId: existing.id,
        status: existing.status,
        cancelRequestedAt: existing.cancel_requested_at,
      });
    }
    if (finishedStatuses.has(existing.status)) {
      throw new HttpError(
        409,
        "JOB_NOT_CANCELLABLE",
        `A job in ${existing.status} cannot be cancelled`,
      );
    }

    const requestedAt = new Date().toISOString();
    const queued = existing.status === "queued" || existing.status === "stalled";
    let mutation = admin
      .from("import_jobs")
      .update(
        queued
          ? {
              status: "cancelled",
              current_stage: "cancelled",
              cancel_requested_at: requestedAt,
              completed_at: requestedAt,
              error_code: "JOB_CANCELLED",
              error_message_key: "error.job_cancelled",
            }
          : {
              cancel_requested_at: requestedAt,
            },
      )
      .eq("id", existing.id)
      .eq("owner_id", user.id)
      .eq("status", existing.status);
    if (existing.cancel_requested_at === null) {
      mutation = mutation.is("cancel_requested_at", null);
    }

    const { data: updated, error: updateError } = await mutation
      .select("id,status,cancel_requested_at")
      .maybeSingle();
    if (updateError) {
      throw new HttpError(
        500,
        "DATABASE_ERROR",
        "Could not request cancellation",
        false,
      );
    }

    if (!updated) {
      const { data: raced } = await admin
        .from("import_jobs")
        .select("id,status,cancel_requested_at")
        .eq("id", existing.id)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!raced) {
        throw new HttpError(404, "NOT_FOUND", "Import job was not found");
      }
      return jsonResponse(request, 409, {
        error: {
          code: "JOB_STATE_CHANGED",
          message: "The job changed while cancellation was requested.",
          jobId: raced.id,
          status: raced.status,
          cancelRequestedAt: raced.cancel_requested_at,
        },
      });
    }

    return jsonResponse(request, 202, {
      jobId: updated.id,
      status: updated.status,
      cancelRequestedAt: updated.cancel_requested_at,
    });
  } catch (error) {
    return errorResponse(request, error);
  }
});
