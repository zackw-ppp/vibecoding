# Mise Project Overview

Mise is a bilingual recipe-capture workspace for people who want to turn
public cooking media or their own inputs into evidence-linked recipes they can
review and cook from. The current deliverable is an offline-capable Fixture
Demo for product evaluation and frontend development, backed by production
domain, Supabase, worker, and generated Capacitor iOS foundations; it is not a
live social-media scraper. The native status is **Capacitor shell generated;
native/share integration incomplete**.

## Feature progress

Status: ✅ implemented and usable · 🧱 implemented foundation, not integrated ·
🚧 incomplete · ⛔ unavailable

| Area | Status | Current boundary |
|---|---:|---|
| Offline Fixture Demo | ✅ | Complete guest journey using bundled data and SVG media; no network service is required |
| Recipe library | ✅ | Bilingual search, filters, sort, grid/list views, favorites, and status display |
| Simulated import | ✅ | Local staged progress, cancellation/retry states, and honest failure fixtures |
| Evidence review | ✅ | Frozen captions/OCR, issue queue, local edits, provenance states, and save flow |
| Recipe detail and cook mode | ✅ | Storyboard, source references, units, timers, ingredient checks, step completion, and wake lock when available |
| English / Simplified Chinese | ✅ | UI locale plus translated, original, and bilingual recipe display |
| Themes and responsive UI | ✅ | Warm Kitchen, Fresh Garden, Midnight Cook, system preference, mobile/desktop review layouts |
| Offline PWA behavior | ✅ | Production service worker precaches the static entry/manifest/fixture assets and runtime-caches same-origin bundles; build-aware hashed-bundle precaching remains a gap |
| Domain/platform contracts | ✅ | Strict Zod schemas, job transitions, safe URL detection, error catalog, and eight regression scenarios |
| Repository layer | 🧱 | In-memory and Supabase interfaces exist; the client still uses its simpler fixture store |
| Supabase backend | 🧱 | Migration, RLS, private buckets, job claim RPC, and create/cancel Edge Functions exist; no configured project is bundled |
| Ingestion worker | 🧱 | Health checks, fixture pipeline, provider protocols, and ephemeral workspaces exist; no production queue reporter is wired |
| Remote platform support | 🧱 | YouTube, Bilibili, TikTok, Xiaohongshu, and Douyin have URL detectors/future adapter contracts only |
| Live media acquisition | ⛔ | Remote adapters deliberately return `PROVIDER_NOT_CONFIGURED` |
| Live ASR/OCR/extraction | ⛔ | Provider interfaces exist; only deterministic fixture providers succeed |
| Upload/image/text ingestion | 🚧 | Edge input shapes exist; client controls are placeholders and worker processing is absent |
| Authentication and cloud sync | 🚧 | Supabase ownership foundations exist; client sign-in buttons clearly report unavailable |
| Capacitor 8 iOS shell | 🧱 | Generated iOS 15 project, populated app-icon/splash catalogs, and synchronized web bundle exist with seven runtime plugins; no Xcode build or native validation |
| iOS Share Extension | 🚧 | Bilingual, bounded Swift source/plist scaffold only; no Xcode target, entitlements, App Group, host inbox consumer, compile, or device test, so it is not usable |

Fixture output must never be represented as live parsing.

## Structure

```text
apps/client/                 React/Vite Fixture Demo, PWA, and generated Capacitor shell
apps/client/ios/             Generated iOS project, SPM bridge/plugins, and synced web output
apps/client/scripts/         Reproducible iOS app-icon/splash asset generator
apps/share-extension/        Unwired Swift source/plist and localization scaffold
packages/recipe-domain/      Production recipe/evidence schemas
packages/platform-contracts/ Source, URL, job, and error contracts
packages/data-access/        Fixture/local/Supabase repository boundaries
packages/test-fixtures/      Frozen PRD regression scenarios
services/ingestion-worker/   FastAPI fixture pipeline and live-worker scaffold
supabase/                    Database migration and authenticated Edge Functions
_project/                    AI context, overview, and design source of truth
```

## Install, run, build, and test

Web requirements: Node.js 22+ and pnpm 10.33.3.

```sh
pnpm install
pnpm dev          # Vite Fixture Demo
pnpm build        # static output in apps/client/dist
pnpm test         # workspace Vitest suites
pnpm test:e2e     # Playwright desktop and mobile Chromium
pnpm check        # lint + typecheck + unit tests + build
```

Native brand-asset generation uses Playwright with Chrome at
`/usr/local/bin/google-chrome` or the executable selected by `CHROME_PATH`:

```sh
pnpm --filter @mise/client ios:assets
```

It runs `apps/client/scripts/generate-ios-assets.mjs` and writes the 1024×1024
app icon plus three 2732×2732 splash files into the Xcode asset catalogs.
Capacitor synchronization uses the same Node/pnpm requirements:

```sh
pnpm --filter @mise/client ios:sync  # client build + cap sync ios
```

Opening, compiling, signing, running, and archiving the generated native
project require macOS and a compatible Xcode installation:

```sh
pnpm --filter @mise/client ios:open
```

The generated project is `apps/client/ios/App/App.xcodeproj`, targets iOS 15+,
and has not been built in the current Linux environment. `ios:sync` does not
add `apps/share-extension` to Xcode. That scaffold has no working build command;
follow its README on macOS to create and wire a target before any compile or
device test.

Worker verification is separate:

```sh
cd services/ingestion-worker
python -m venv .venv
. .venv/bin/activate
python -m pip install -e '.[dev]'
pytest
ruff check .
mypy src
```

Supabase local setup requires the Supabase CLI:

```sh
supabase start
supabase db reset
supabase functions serve create-import-job --env-file supabase/.env.local
supabase functions serve cancel-import-job --env-file supabase/.env.local
```

See the root `README.md`, `supabase/README.md`, and
`services/ingestion-worker/README.md` before configuring services.

## Recent changes

Newest first:

1. Added and documented a Playwright/Chrome iOS asset generator, the
   `ios:assets` command, and populated app-icon/splash catalogs using the
   asset-only fallback palette.
2. Synchronized all four project documents with the generated shell and the
   still-disconnected native Share Extension boundary.
3. Generated the Capacitor 8 iOS 15 shell, synchronized the built web client,
   and registered seven runtime plugins through Swift Package Manager.
4. Added a bilingual, security-conscious Share Extension source/plist scaffold
   with bounded URL/text/image intake and a versioned pending-import contract;
   it remains outside the Xcode project and host runtime.
5. Added the safe ingestion-worker foundation and a deterministic
   `fixture://` pipeline while keeping every remote adapter explicitly
   unconfigured.

## Known issues and next steps

Work in P0 order:

1. Implement one compliant remote acquisition adapter end to end, including
   redirect-by-redirect allowlisting, DNS/IP validation, address pinning,
   download limits, and terms-compliant access.
2. Add real ASR, OCR, extraction, translation, and evidence-alignment
   providers; validate every output against the shared contracts and preserve
   unknown source values.
3. Implement the Supabase-backed worker reporter/claim loop, transactional
   recipe persistence, bounded asset upload, signed delivery, heartbeats,
   cancellation, and cleanup.
4. Replace the client-only fixture model with the shared domain/data-access
   boundaries; wire Supabase Auth, Edge Functions, job updates, and an explicit
   fixture/live mode.
5. Implement upload/image/text acquisition and verify the real
   media → evidence → recipe loop. The generated native shell must not displace
   these P0 integration gates.

Native follow-up after the P0 loop is operational:

1. Regenerate the static catalogs with `ios:assets` when brand-source changes.
   On macOS/Xcode, resolve SPM dependencies and build the generated shell;
   validate app-icon/splash rendering, iOS 15+ simulator/device behavior, safe
   areas, WebView storage, offline behavior, plugin calls actually used by the
   client, signing, and archive output.
2. Create and embed a real Share Extension target; add the source, plist, and
   English/Simplified Chinese resources; configure matching signing and App
   Group entitlements/provisioning on both targets.
3. Register and route the host URL request, then implement a foreground-aware,
   idempotent App Group inbox consumer that revalidates untrusted payloads and
   files, handles retention/cleanup, and integrates with explicit import UX.
4. Compile and test the extension on supported devices with URL, text, image,
   mixed, oversized, low-storage, and locked-device cases. Treat host opening
   as best effort and retain the manual-open fallback.

Additional concrete gaps:

- Align the documented worker ports before integration (`8787` in the root
  example versus `8080` in the worker runtime).
- Make “clear media cache” delete Cache Storage; it currently records only a
  local timestamp.
- Add build-aware precaching for generated JavaScript/CSS so the first
  production install has a deterministic offline reload, rather than relying
  on runtime/browser caching for those bundles.
- Decide whether the currently installed React Query, Dexie, form, and extra
  Radix packages are part of the production client or should be removed later.
- No Xcode/native build evidence exists, and the Share Extension scaffold is
  not an app feature until its target, entitlements, host consumer, and tests
  are complete. The populated app-icon/splash catalogs are also unvalidated by
  Xcode.
- Add CI and deployment configuration once service boundaries are operational.
