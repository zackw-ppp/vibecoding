# Mise

Mise currently delivers an offline-capable, full **Fixture Demo**, production
foundations, and a generated but unbuilt Capacitor 8 iOS shell. It does
**not** provide completed live social-media scraping, transcription, OCR,
recipe extraction, or usable native sharing.

The demo exercises the intended media → evidence → recipe experience with
bundled, visibly labeled sample data. Pasted URLs are not fetched, upload
controls are placeholders, and simulated progress is never presented as live
worker output.

## What works now

- Responsive English and Simplified Chinese client.
- Guest Fixture Demo with no account or service configuration.
- Recipe library with bilingual search, filters, sorting, grid/list views,
  favorites, and collections.
- Local import simulation with active, review, complete, failed, retry, and
  cancellation states.
- Evidence review with frozen captions/OCR, source timestamps, uncertainty
  states, editable recipe fields, and issue resolution.
- Recipe detail with ingredients, storyboard, source attribution, content
  language modes, and unit preferences.
- Cook mode with per-step ingredients, timers, completion, keyboard
  navigation, and screen wake lock when supported.
- Three semantic themes: Warm Kitchen, Fresh Garden, and Midnight Cook.
- Production-build service worker with static entry/fixture precaching and
  runtime caching for other same-origin assets.
- Tested domain, platform, repository, fixture, worker, and client foundations.

## Status boundaries

| Capability | Status |
|---|---|
| Bundled offline Fixture Demo | Implemented |
| Shared production schemas and regression fixtures | Implemented |
| Supabase schema, RLS, private buckets, and create/cancel functions | Foundation; requires configuration and client wiring |
| Worker health, safe workspaces, provider interfaces, and fixture pipeline | Foundation; not connected to Supabase orchestration |
| Remote platform URL detection/normalization | Implemented contract only |
| Live platform media acquisition | Not implemented; adapters fail explicitly |
| Live ASR, OCR, extraction, translation, and evidence alignment | Not implemented |
| Local video/image/text ingestion | Input contracts only; client/worker path unfinished |
| Authentication and cloud sync | Unfinished |
| Capacitor 8 iOS shell | Generated foundation under `apps/client/ios`, including reproducible app-icon/splash catalogs; not built or validated in Xcode |
| Native/share integration | Incomplete; Share Extension source/plist scaffold only, with no Xcode target, entitlements, App Group, host consumer, or compile/device test |

In short: **Capacitor shell generated; native/share integration incomplete.**

Fixture output must never be described as live parsing.

## Architecture

### Current offline path

```text
Bundled recipes + SVG media
          ↓
Zustand fixture store → browser localStorage
          ↓
React library → simulated import → evidence review → recipe → cook mode
          ↓
Production service worker cache
```

The client currently uses a simplified fixture model under
`apps/client/src/data/`. It does not yet consume the shared production
repositories or initialize Supabase, React Query, or Dexie.

### Generated iOS packaging path

```text
Vite client → apps/client/dist
                  ↓ pnpm --filter @mise/client ios:sync
       generated Capacitor project + copied web bundle
                  ↓
        CAPBridgeViewController WebView
```

The shell targets iOS 15+, uses app identifier `com.mise.recipes`, and has
generated Swift Package Manager references for seven runtime plugins: App,
Browser, Filesystem, Haptics, Preferences, Splash Screen, and Status Bar.
Their presence does not mean that native product flows use every plugin. The
project also contains generated 1024×1024 app-icon and 2732×2732 splash
rasters. It has not been built because this environment has no macOS or Xcode.

`apps/share-extension/` is outside this path. It contains a bilingual,
security-conscious Swift source/plist scaffold and a versioned pending-import
contract, but it is not a member of the Xcode project and cannot currently run.

### Intended production P0 path

```text
Authenticated client
  → Supabase create-import-job Edge Function
  → import_jobs queue
  → ingestion worker claims a job
  → compliant media acquisition on ephemeral disk
  → ASR/OCR/extraction/evidence alignment
  → versioned recipe + evidence in PostgreSQL
  → bounded derived media in private Storage
  → client review and cook experience
```

The database, contracts, Edge boundaries, and worker protocols support this
shape, but the path is not operational end to end. The next priority is the
real P0 loop, not secondary P1 features.

## Quick start: Fixture Demo

Requirements:

- Node.js 22+
- pnpm 10.33.3

```sh
pnpm install
pnpm dev
```

Open Vite's printed local URL, normally `http://localhost:5173`. Enter the
sample kitchen from the welcome screen. No `.env` file, Supabase project,
provider key, or worker is required for this mode.

For a production-style static build:

```sh
pnpm build
pnpm --filter @mise/client preview
```

The generated client is in `apps/client/dist/`. Service-worker registration
occurs only in a production build. A deployment must use HTTPS and provide SPA
fallback to `index.html`; no hosting target is configured in this repository.
The current static precache includes the root document, manifest, icon, and
fixture SVGs; generated JavaScript/CSS rely on runtime/browser caching, so a
build-aware precache is still needed for a guaranteed first-install offline
reload.

## iOS shell: sync and open

After installing workspace dependencies, regenerate the static iOS app-icon
and splash assets when their source changes:

```sh
pnpm --filter @mise/client ios:assets
```

This runs `apps/client/scripts/generate-ios-assets.mjs` through Playwright. It
expects Chrome at `/usr/local/bin/google-chrome` unless `CHROME_PATH` points to
another executable, and writes directly to the generated Xcode asset catalogs
under `apps/client/ios/App/App/Assets.xcassets/`.

Synchronize the current web build and Capacitor dependencies separately:

```sh
pnpm --filter @mise/client ios:sync
```

That script runs the client build and `cap sync ios`. To open and build the
native project, use a macOS host with a Capacitor-compatible Xcode installation:

```sh
pnpm --filter @mise/client ios:open
```

Then resolve Swift packages, configure signing, and build from
`apps/client/ios/App/App.xcodeproj`. No `.app`, simulator, device, or archive
build has been validated yet. `ios:sync` does not add the Share Extension.
Follow `apps/share-extension/README.md` only on macOS/Xcode to create its
target, then wire resources, signing, entitlements, the App Group, URL routing,
and the host inbox consumer before testing. Until those steps are complete, the
extension is neither implemented as an app target nor usable.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e

# All workspace checks except Playwright
pnpm check
```

Playwright runs desktop Chrome and a Pixel 7 profile against
`http://127.0.0.1:4173`.

Worker checks are separate:

```sh
cd services/ingestion-worker
python -m venv .venv
. .venv/bin/activate
python -m pip install -e '.[dev]'
pytest
ruff check .
mypy src
```

## Worker foundation

The FastAPI worker currently provides:

- `GET /health/live`
- `GET /health/ready`
- non-production OpenAPI UI at `/docs`
- strict fixture/live readiness reporting;
- safe per-job workspaces and cleanup;
- job-stage, heartbeat, cancellation, adapter, and provider protocols;
- one successful `fixture://` adapter/provider path.

It does not expose a public import route. Every YouTube, Bilibili, TikTok,
Xiaohongshu, and Douyin acquisition method deliberately raises
`PROVIDER_NOT_CONFIGURED`.

Local setup:

```sh
cd services/ingestion-worker
cp .env.example .env
python -m venv .venv
. .venv/bin/activate
python -m pip install -e '.[dev]'
uvicorn recipe_worker.app:app --reload --port 8080
```

The root environment example reserves port `8787`, while the worker docs and
container use `8080`. Align these values when integration is implemented;
the client currently calls neither.

See [`services/ingestion-worker/README.md`](services/ingestion-worker/README.md)
for workspace lifecycle and SSRF requirements.

## Supabase foundation

The migration defines Auth-owned profiles, sources, versioned recipes,
ingredients, steps, transcripts, evidence, review issues, jobs, collections,
RLS policies, private Storage buckets, and a service-role-only job-claim RPC.
Authenticated Edge Functions create and cancel jobs.

With the Supabase CLI installed:

```sh
supabase start
supabase db reset
cp supabase/.env.example supabase/.env.local
supabase functions serve create-import-job --env-file supabase/.env.local
supabase functions serve cancel-import-job --env-file supabase/.env.local
```

This starts backend foundations only. The client does not yet sign in, invoke
these functions, subscribe to jobs, or read cloud recipes.

See [`supabase/README.md`](supabase/README.md) for RLS, CORS, Storage, and local
configuration details.

## Environment safety

Example files contain variable names and safe local placeholders only:

- [`.env.example`](.env.example)
- [`supabase/.env.example`](supabase/.env.example)
- [`services/ingestion-worker/.env.example`](services/ingestion-worker/.env.example)

Rules:

- Only browser-safe publishable configuration may use a `VITE_` prefix.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_SHARED_SECRET`,
  provider API keys, upload-signing secrets, platform cookies, or user JWTs to
  client code.
- Never commit local `.env` files.
- Full downloaded source media must stay on ephemeral worker disk and be
  deleted after processing. Only attribution, structured data, evidence,
  keyframes, bounded clips, and expiring review proxies may persist.
- URL host/path normalization is only a syntax boundary. A live transport must
  revalidate every redirect, reject non-global DNS answers, pin the validated
  address, preserve TLS hostname, cap redirects/bytes/time/types, and never
  forward credentials across hosts.

Several root variables are reserved and are not consumed by the current
client/service wiring. Filling them does not enable live parsing.

## Platform contracts

| Input | What exists | What is still required |
|---|---|---|
| YouTube | Exact host/path detector, canonicalization, short-link marker | Compliant metadata/media adapter and providers |
| Bilibili | Exact host/path detector, canonicalization, short-link marker | Compliant metadata/media adapter and providers |
| TikTok | Exact host/path detector, canonicalization, short-link marker | Compliant metadata/media adapter and providers |
| Xiaohongshu | Exact host/path detector, canonicalization, short-link marker | Compliant metadata/media adapter and providers |
| Douyin | Exact host/path detector, canonicalization, short-link marker | Compliant metadata/media adapter and providers |
| Local video/images/text | Edge input/schema foundations | Upload authorization, acquisition, worker processing, and client UI |
| iOS-shared URL/text/image | Versioned, bounded pending-import source/plist scaffold | Xcode target, localized resources, App Group entitlements, host revalidation/consumer, cleanup, and device tests |
| `fixture://` | Deterministic adapter/provider and frozen scenarios | Already usable for tests/demo; never a live-source claim |

Detector support means a URL shape can be safely classified without network
I/O. It does not mean the source can be downloaded or parsed.

## Repository structure

```text
apps/client/                 React/Vite Fixture Demo, PWA, and generated Capacitor iOS shell
apps/client/scripts/generate-ios-assets.mjs
                             Reproducible iOS app-icon and splash raster generator
apps/share-extension/        Unwired bilingual Swift Share Extension scaffold
packages/recipe-domain/      Versioned recipe and evidence Zod schemas
packages/platform-contracts/ URL, source bundle, import job, and error contracts
packages/data-access/        In-memory and Supabase repository boundaries
packages/test-fixtures/      Eight PRD scenarios and rich frozen fixture data
services/ingestion-worker/   FastAPI worker scaffold and fixture pipeline
supabase/                    Core migration and authenticated Edge Functions
_project/                    Maintainer context, overview, and design system
```

## Project documentation

- [`_project/AI_CONTEXT.md`](_project/AI_CONTEXT.md): stack, architecture,
  storage, environment, boundaries, tests, and iteration log.
- [`_project/OVERVIEW.md`](_project/OVERVIEW.md): feature status and prioritized
  next steps.
- [`_project/DESIGN_SYSTEM.md`](_project/DESIGN_SYSTEM.md): source of truth for
  tokens and component patterns synchronized with
  `apps/client/src/index.css`.
