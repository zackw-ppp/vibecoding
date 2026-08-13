import {
  createClient,
  type SupabaseClient,
  type User,
} from "npm:@supabase/supabase-js@2.112.3";
import { z } from "npm:zod@4.4.3";

export { z };

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
} as const;

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly expose: boolean;

  constructor(
    status: number,
    code: string,
    message: string,
    expose = true,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

export interface AuthContext {
  readonly user: User;
  /**
   * Server-only service-role client. Never serialize it or its credentials.
   * All owner_id values must come from `user.id`, never request input.
   */
  readonly admin: SupabaseClient;
}

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new HttpError(
      500,
      "SERVER_MISCONFIGURED",
      `Required server environment variable ${name} is missing`,
      false,
    );
  }
  return value;
}

export async function authenticate(request: Request): Promise<AuthContext> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match?.[1]) {
    throw new HttpError(401, "UNAUTHORIZED", "A valid Bearer token is required");
  }

  const admin = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
  const { data, error } = await admin.auth.getUser(match[1]);
  if (error || !data.user) {
    throw new HttpError(401, "UNAUTHORIZED", "The access token is invalid");
  }
  return { user: data.user, admin };
}

export async function parseJson(
  request: Request,
  maximumBytes = 200_000,
): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError(
      415,
      "INVALID_INPUT",
      "Content-Type must be application/json",
    );
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new HttpError(413, "INVALID_INPUT", "Request body is too large");
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maximumBytes) {
    throw new HttpError(413, "INVALID_INPUT", "Request body is too large");
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "INVALID_INPUT", "Request body is not valid JSON");
  }
}

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin === null) return null;
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return configured.includes(origin) ? origin : null;
}

export function assertAllowedOrigin(request: Request): void {
  if (request.headers.has("origin") && allowedOrigin(request) === null) {
    throw new HttpError(403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed");
  }
}

function corsHeaders(request: Request): HeadersInit {
  const origin = allowedOrigin(request);
  return {
    ...(origin === null ? {} : { "access-control-allow-origin": origin }),
    "access-control-allow-headers":
      "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

export function handlePreflight(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;
  if (request.headers.has("origin") && allowedOrigin(request) === null) {
    return jsonResponse(
      request,
      403,
      { error: { code: "ORIGIN_NOT_ALLOWED", message: "Origin is not allowed" } },
    );
  }
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function jsonResponse(
  request: Request,
  status: number,
  body: unknown,
  extraHeaders: HeadersInit = {},
): Response {
  const headers = new Headers(corsHeaders(request));
  new Headers(extraHeaders).forEach((value, key) => headers.set(key, value));
  Object.entries(JSON_HEADERS).forEach(([key, value]) =>
    headers.set(key, value),
  );
  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

export function errorResponse(request: Request, error: unknown): Response {
  const reference = crypto.randomUUID();
  if (error instanceof HttpError) {
    if (error.status >= 500) {
      console.error(
        JSON.stringify({
          event: "edge_function_error",
          reference,
          code: error.code,
          name: error.name,
        }),
      );
    }
    return jsonResponse(request, error.status, {
      error: {
        code: error.code,
        message: error.expose ? error.message : "The request could not be completed",
        reference,
      },
    });
  }
  console.error(
    JSON.stringify({
      event: "edge_function_error",
      reference,
      code: "UNKNOWN_ERROR",
      name: error instanceof Error ? error.name : "unknown",
    }),
  );
  return jsonResponse(request, 500, {
    error: {
      code: "UNKNOWN_ERROR",
      message: "The request could not be completed",
      reference,
    },
  });
}
