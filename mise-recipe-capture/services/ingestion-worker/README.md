# Mise ingestion worker

FastAPI scaffold for ephemeral recipe-source processing. It provides strict
configuration, URL/platform detection, pipeline state transitions, fixture
processing, per-job workspaces, and health endpoints. It does **not** pretend
that live social-platform acquisition works: every live adapter's metadata and
media methods raise `PROVIDER_NOT_CONFIGURED` until a compliant backend is
implemented.

Supported URL detectors are present for YouTube, Bilibili, TikTok,
Xiaohongshu, and Douyin. The explicit `fixture://` adapter/provider is the only
successful acquisition path in this scaffold.

## Run locally

Python 3.12 and FFmpeg are the container baseline.

```sh
python -m venv .venv
. .venv/bin/activate
python -m pip install -e '.[dev]'
cp .env.example .env
uvicorn recipe_worker.app:app --reload --port 8080
```

Do not install dependencies as part of a constrained/offline agent run; syntax
checks can still use `python -m compileall src tests`.

```sh
pytest
ruff check .
mypy src
docker build -t mise-ingestion-worker .
```

Endpoints:

- `GET /health/live` reports process liveness.
- `GET /health/ready` reports configuration readiness without returning
  secret values. Live mode remains not-ready while live acquisition is absent.

No job-management route is public. Production orchestration should claim work
with the server-only `claim_next_import_job` RPC, persist each stage and
heartbeat, and check cancellation at every stage boundary through the
`JobReporter` protocol.

## Pipeline and storage lifecycle

The state machine follows the PRD stages from `queued` through
`needs_review`, with explicit failure, cancellation, partial-failure, stalled,
and retry transitions. Fixture runs produce text-only manifests. They are
tagged as fixtures and never represent platform scraping.

`WorkspaceManager` creates a UUID-named directory per job with mode-restricted
marker metadata. Cleanup runs in `finally` on success, failure, and
cancellation. A maximum 24-hour TTL cleanup handles crashed processes and
deletes only marked directories without following symlinks. Disk use is
bounded before and during work.

Full source media must remain in these temporary directories. Never upload it
to Supabase persistent storage. Only structured recipes, source attribution,
transcripts, review evidence, keyframes, and bounded step clips may persist.

## SSRF and platform credentials

URL parsing is only the first validation boundary. The URL detector requires
an exact supported host, an expected public-post path, no user info, no custom
port, and HTTP(S). Short links are marked for controlled resolution.

A future network acquisition implementation must, before every connection and
redirect:

1. re-run scheme, host, port, and path allowlisting;
2. resolve all DNS answers and reject every non-global IP (loopback, private,
   link-local, multicast, reserved, and metadata endpoints);
3. connect to a validated IP while preserving the validated TLS hostname,
   preventing a second uncontrolled DNS lookup;
4. cap redirects, response bytes, processing time, and accepted media types;
5. never forward user authorization headers or platform cookies across hosts;
6. log only job IDs and sanitized error references, never tokens, cookies,
   full query strings, transcripts, or raw user content.

`validate_public_dns_answers` supplies the address classification check, but
the eventual HTTP transport must pin the checked address to avoid DNS
rebinding. Cookies, provider keys, the Supabase service-role key, and the
worker shared secret belong only in runtime secret storage. `.env.example`
contains no credentials.
