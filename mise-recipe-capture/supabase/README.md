# Supabase backend

This directory contains the database migration and authenticated Edge Function
boundaries for import creation and cancellation.

## Local use

With the Supabase CLI installed:

```sh
supabase start
supabase db reset
supabase functions serve create-import-job --env-file supabase/.env.local
supabase functions serve cancel-import-job --env-file supabase/.env.local
```

Copy `.env.example` to `.env.local` and use values printed by
`supabase status`. Never commit `.env.local`, a service-role key, worker
credentials, provider keys, cookies, or user JWTs.

Set `ALLOWED_ORIGINS` to an explicit comma-separated list. Include each web
origin and any Capacitor origin used by a signed client; the functions do not
emit wildcard CORS headers. Both functions verify the Bearer JWT with Supabase
Auth and derive `owner_id` from the verified user. The service-role client only
exists inside the function runtime.

## Data and media safety

- Every public user-data table has RLS enabled. Import jobs are created and
  cancelled through Edge Functions; clients can read only their own jobs.
- `recipe-media` and `temp-review` are private. Object paths must begin with
  the authenticated user's UUID.
- `media_assets` cannot represent a persistent raw source video. Review
  proxies require an expiry and the `temp-review` bucket.
- Full source media belongs only on worker ephemeral disk. The database stores
  source attribution, structured data, evidence, and bounded derived assets.
- `claim_next_import_job(worker_id)` is granted only to `service_role` and uses
  `FOR UPDATE SKIP LOCKED`.

## SSRF boundary

Edge URL validation is deliberately non-networked: it requires HTTPS-compatible
public-post shapes on an exact host allowlist and marks known short links for
resolution. The worker remains responsible for the network boundary. Before
every request and redirect it must:

1. allow only HTTP/HTTPS and approved platform hosts;
2. reject credentials, custom ports, non-post paths, and redirect endpoints;
3. resolve DNS and reject loopback, link-local, private, multicast, reserved,
   and otherwise non-global addresses for every answer;
4. connect only to the validated address while preserving the validated host;
5. cap redirects, bytes, duration, and response content types; and
6. never forward user authorization headers, cookies, or secrets to redirects.

Syntax allowlisting alone is not an SSRF defense. Platform acquisition must
stay in the worker, where DNS and socket behavior can be controlled.
