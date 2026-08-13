# Mise AI Context

Last synchronized: 2026-08-13

This file is the operational handoff for coding agents. Read it with
`OVERVIEW.md` and `DESIGN_SYSTEM.md` before changing the product.

## User Emphases

1. Build from the supplied Recipe Capture PRD and design system.
2. Keep this a dedicated GitHub project named **Mise** in
   `mise-recipe-capture`.
3. Prioritize the real **media → evidence → recipe** P0 loop before P1 work.
4. Never present fixture output as live parsing. Fixture sources, progress,
   transcripts, OCR, media stand-ins, and recipes must remain visibly labeled
   as fixtures.

## Current truth

Mise currently provides a complete, offline-capable **Fixture Demo** of the
main product journey: enter as a guest, browse bilingual recipes, simulate an
import, inspect evidence, resolve review issues, save a recipe, and use cook
mode. It does not scrape, download, transcribe, OCR, or parse live social
content.

Production foundations exist but are not connected end to end:

- shared Zod domain and platform contracts;
- deterministic rich fixtures and repository interfaces;
- a Supabase schema, RLS policies, private buckets, and authenticated create /
  cancel Edge Functions;
- a FastAPI worker scaffold with safe workspaces, a fixture pipeline, URL
  detectors, and provider protocols;
- a generated Capacitor 8 iOS project containing the synchronized web bundle
  and seven runtime plugins; and
- a separate bilingual, security-conscious Share Extension source/plist
  scaffold that is not connected to an Xcode target or the host app.

All remote platform adapters intentionally raise `PROVIDER_NOT_CONFIGURED`.
The client does not initialize Supabase, call Edge Functions, or call the
worker. The worker exposes health endpoints only and has no public job route.

The native status must be stated precisely: **Capacitor shell generated;
native/share integration incomplete.** The iOS project has not been built or
validated because this environment does not provide macOS or Xcode. The Share
Extension is not implemented as a runnable extension: it has no target
membership, entitlements, configured App Group, host inbox consumer, or
compile/device test.

## Complete tech stack

### Repository and language baseline

- pnpm workspace monorepo; package manager `pnpm@10.33.3`.
- Node.js 22 or newer.
- TypeScript `~6.0.2`, strict mode, ES2022/ES2023 targets.
- Python 3.12 for the ingestion worker.
- SQL/PostgreSQL and Deno TypeScript for Supabase.

### Client application

- React `19.2.8` and React DOM.
- Vite `8.2.0` with `@vitejs/plugin-react`.
- Tailwind CSS `4.3.3` through `@tailwindcss/vite`; semantic tokens live in
  `apps/client/src/index.css`.
- React Router `7.18.2`.
- Zustand `5.0.15` with local-storage persistence.
- i18next `26.3.6` and react-i18next `17.0.11`.
- Radix primitives currently used: Checkbox, Dialog (as Sheet), Progress,
  Slot, and Tabs.
- UI composition: class-variance-authority, clsx, and tailwind-merge.
- Lucide React icons and Sonner toasts.
- Installed client foundations not yet wired into runtime code:
  `@supabase/supabase-js`, `@tanstack/react-query`, Dexie,
  react-hook-form, `@hookform/resolvers`, and Zod.
- Installed Radix packages not yet used by the client:
  Dropdown Menu, Scroll Area, Select, Separator, Switch, and Tooltip.
- Production-only service worker and web app manifest for offline assets.

### Native iOS scaffolding

- Capacitor core, CLI, and iOS are `8.5.0`; the generated UIKit/Swift shell is
  under `apps/client/ios` and has an iOS 15 deployment target.
- `apps/client/capacitor.config.ts` sets app identifier
  `com.mise.recipes`, app name `Mise`, web directory `dist`, internal iOS
  WebView scheme `mise`, an 800 ms spinner-free splash, and a non-overlaying
  status bar.
- Seven installed runtime plugins are emitted into the generated config and
  Swift Package Manager package: App `8.1.1`, Browser `8.0.4`, Filesystem
  `8.1.2`, Haptics `8.0.2`, Preferences `8.0.1`, Splash Screen `8.0.2`, and
  Status Bar `8.0.3`.
- Plugin registration is generated infrastructure, not evidence that the web
  client currently calls or depends on each native API.
- `ios:assets` runs `apps/client/scripts/generate-ios-assets.mjs`. The Node
  script drives Playwright Chromium, using `CHROME_PATH` when set or
  `/usr/local/bin/google-chrome` by default, to render deterministic native
  brand rasters directly into the Xcode asset catalogs.
- Generated brand output is one universal 1024×1024 app icon and one
  2732×2732 splash raster copied to the catalog’s 1x/2x/3x filenames. The
  rendering uses the documented static asset fallback palette, not live CSS
  semantic variables.
- `ios:sync` runs the client build followed by `cap sync ios`; `ios:open` runs
  `cap open ios`.
- The generated app uses `CAPBridgeViewController`, Swift Package Manager, and
  targets iPhone and iPad. No native build, simulator run, device run, signing,
  archive, or distribution validation has occurred.
- `apps/share-extension` contains UIKit/Swift source, a pending-import model,
  activation plist, and English/Simplified Chinese strings. It is source-only:
  it is absent from `App.xcodeproj`, has no extension target or entitlements,
  and has not been compiled or tested.

### Shared TypeScript packages

- `@mise/recipe-domain`: strict Zod schemas and aggregate invariants for
  localized text, evidence, quantities, media, versioned recipes, and review
  issues.
- `@mise/platform-contracts`: source bundles, import-job state machine,
  standard error catalog, safe URL normalization, and result contracts.
- `@mise/data-access`: fixture/local repositories, Supabase repository
  interfaces, owner checks, and revision-conflict behavior.
- `@mise/test-fixtures`: eight PRD regression scenarios plus a frozen,
  schema-valid import result with textual media stand-ins.

### Backend foundations

- Supabase PostgreSQL migration with Auth-linked ownership, RLS, Storage,
  Realtime publication for import jobs, and a service-role-only job-claim RPC.
- Supabase Edge Functions on Deno:
  `create-import-job` and `cancel-import-job`.
- Edge dependencies are pinned npm imports of Supabase JS `2.112.3` and Zod
  `4.4.3`.
- Python worker: FastAPI `0.141.1`, Pydantic `2.13.4`,
  pydantic-settings `2.15.0`, and Uvicorn `0.52.1`.
- FFmpeg/ffprobe are included in the worker container baseline but no live
  rendering path is implemented.
- Docker target uses Python 3.12 slim, a non-root user, and `tini`.

### Quality tooling

- Client/packages: Vitest `4.1.10`, Testing Library, jsdom, Oxlint, and
  Playwright `1.62.1`.
- Worker: pytest `9.1.1`, Ruff `0.16.2`, mypy `2.3.0`, and compileall as an
  offline syntax check.
- No CI workflow or deployment configuration is present.

## Current project structure

Generated directories are shown for orientation but are not source.

```text
mise-recipe-capture/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── _project/
│   ├── AI_CONTEXT.md
│   ├── DESIGN_SYSTEM.md
│   └── OVERVIEW.md
├── apps/
│   ├── client/
│   │   ├── e2e/
│   │   │   └── fixture-flow.spec.ts
│   │   ├── ios/                        # generated Capacitor 8 project
│   │   │   ├── App/
│   │   │   │   ├── App.xcodeproj/
│   │   │   │   │   └── project.pbxproj
│   │   │   │   ├── App/
│   │   │   │   │   ├── AppDelegate.swift
│   │   │   │   │   ├── SceneDelegate.swift
│   │   │   │   │   ├── Assets.xcassets/
│   │   │   │   │   │   ├── AppIcon.appiconset/
│   │   │   │   │   │   │   ├── AppIcon-512@2x.png
│   │   │   │   │   │   │   └── Contents.json
│   │   │   │   │   │   ├── Splash.imageset/
│   │   │   │   │   │   │   ├── splash-2732x2732.png
│   │   │   │   │   │   │   ├── splash-2732x2732-1.png
│   │   │   │   │   │   │   ├── splash-2732x2732-2.png
│   │   │   │   │   │   │   └── Contents.json
│   │   │   │   │   │   └── Contents.json
│   │   │   │   │   ├── Base.lproj/
│   │   │   │   │   ├── Info.plist
│   │   │   │   │   ├── capacitor.config.json  # generated
│   │   │   │   │   ├── config.xml             # generated
│   │   │   │   │   └── public/                # synced web output
│   │   │   │   └── CapApp-SPM/
│   │   │   │       ├── Package.swift
│   │   │   │       └── Sources/CapApp-SPM/CapApp-SPM.swift
│   │   │   ├── capacitor-cordova-ios-plugins/ # generated placeholders
│   │   │   └── debug.xcconfig
│   │   ├── public/
│   │   │   ├── favicon.svg
│   │   │   ├── manifest.webmanifest
│   │   │   ├── sw.js
│   │   │   └── media/
│   │   │       ├── lemon-cake.svg
│   │   │       ├── scallion-noodles.svg
│   │   │       ├── steamed-fish.svg
│   │   │       ├── tomato-pasta.svg
│   │   │       ├── step-noodles.svg
│   │   │       ├── step-oil.svg
│   │   │       ├── step-pasta-pot.svg
│   │   │       ├── step-sauce.svg
│   │   │       └── step-scallions.svg
│   │   ├── scripts/
│   │   │   └── generate-ios-assets.mjs
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── AppRuntime.tsx
│   │   │   │   ├── domain/
│   │   │   │   │   ├── CookStep.tsx
│   │   │   │   │   ├── recipe.tsx
│   │   │   │   │   └── status.tsx
│   │   │   │   ├── layout/AppShell.tsx
│   │   │   │   └── ui/primitives.tsx
│   │   │   ├── data/
│   │   │   │   ├── fixtures.ts
│   │   │   │   └── types.ts
│   │   │   ├── i18n/
│   │   │   │   ├── index.ts
│   │   │   │   ├── resources.test.ts
│   │   │   │   └── resources.ts
│   │   │   ├── lib/cn.ts
│   │   │   ├── pages/
│   │   │   │   ├── CollectionsPage.tsx
│   │   │   │   ├── CookPage.tsx
│   │   │   │   ├── ImportPage.tsx
│   │   │   │   ├── NotFoundPage.tsx
│   │   │   │   ├── RecipeDetailPage.tsx
│   │   │   │   ├── RecipesPage.tsx
│   │   │   │   ├── ReviewPage.tsx
│   │   │   │   ├── SettingsPage.tsx
│   │   │   │   └── WelcomePage.tsx
│   │   │   ├── store/
│   │   │   │   ├── use-mise-store.test.ts
│   │   │   │   └── use-mise-store.ts
│   │   │   ├── test/setup.ts
│   │   │   ├── App.test.tsx
│   │   │   ├── App.tsx
│   │   │   ├── index.css
│   │   │   └── main.tsx
│   │   ├── .gitignore
│   │   ├── .oxlintrc.json
│   │   ├── README.md
│   │   ├── capacitor.config.ts
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── playwright.config.ts
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json
│   │   ├── vite.config.ts
│   │   ├── dist/              # generated Vite output; currently present
│   │   ├── node_modules/      # generated package links/cache
│   │   └── test-results/      # generated Playwright state
│   └── share-extension/       # source-only; not in App.xcodeproj
│       ├── Resources/
│       │   ├── en.lproj/
│       │   │   ├── InfoPlist.strings
│       │   │   └── Localizable.strings
│       │   ├── zh-Hans.lproj/
│       │   │   ├── InfoPlist.strings
│       │   │   └── Localizable.strings
│       │   └── Info.plist
│       ├── Sources/
│       │   ├── PendingImport.swift
│       │   └── ShareViewController.swift
│       └── README.md
├── packages/
│   ├── recipe-domain/
│   │   ├── src/index.ts
│   │   ├── tests/domain.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── platform-contracts/
│   │   ├── src/index.ts
│   │   ├── tests/contracts.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── data-access/
│   │   ├── src/index.ts
│   │   ├── tests/repositories.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── test-fixtures/
│       ├── src/index.ts
│       ├── tests/fixtures.test.ts
│       ├── package.json
│       └── tsconfig.json
├── services/
│   └── ingestion-worker/
│       ├── src/recipe_worker/
│       │   ├── __init__.py
│       │   ├── adapters.py
│       │   ├── app.py
│       │   ├── config.py
│       │   ├── errors.py
│       │   ├── models.py
│       │   ├── pipeline.py
│       │   ├── providers.py
│       │   └── workspace.py
│       ├── tests/
│       │   ├── test_adapters.py
│       │   ├── test_health.py
│       │   └── test_pipeline_workspace.py
│       ├── .dockerignore
│       ├── .env.example
│       ├── Dockerfile
│       ├── pyproject.toml
│       └── README.md
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── http.ts
│   │   │   └── source-url.ts
│   │   ├── cancel-import-job/index.ts
│   │   └── create-import-job/index.ts
│   ├── migrations/202608130001_core.sql
│   ├── .env.example
│   └── README.md
└── node_modules/              # generated workspace install; currently present
```

## Key-files map

| Area | File | Responsibility |
|---|---|---|
| Routes | `apps/client/src/App.tsx` | Browser routes, shell placement, toaster |
| Runtime | `apps/client/src/components/AppRuntime.tsx` | Applies theme/locale and advances simulated jobs |
| State | `apps/client/src/store/use-mise-store.ts` | Fixture data mutations and Zustand persistence |
| Fixture UI data | `apps/client/src/data/fixtures.ts` | Four display recipes, jobs, collections, and review issues |
| Fixture UI types | `apps/client/src/data/types.ts` | Simplified UI-only model; not the production domain package |
| Product copy | `apps/client/src/i18n/resources.ts` | Matching English and Simplified Chinese key sets |
| Design tokens | `apps/client/src/index.css` | Three themes, semantic mapping, layout helpers, and motion |
| Primitives | `apps/client/src/components/ui/primitives.tsx` | Buttons, badges, fields, tabs, progress, checkbox, sheet |
| Domain UI | `apps/client/src/components/domain/*.tsx` | Recipe, evidence, job, issue, theme, and cook patterns |
| Offline shell | `apps/client/public/sw.js` | Production-only same-origin asset/navigation caching |
| Capacitor config | `apps/client/capacitor.config.ts` | App identity, `dist` web directory, iOS WebView scheme, splash, and status-bar settings |
| iOS asset generator | `apps/client/scripts/generate-ios-assets.mjs` | Playwright/Chrome renderer for deterministic native app-icon and splash PNGs |
| Native asset catalogs | `apps/client/ios/App/App/Assets.xcassets/` | Generated 1024 px app icon and 2732 px splash files referenced by Xcode catalog manifests |
| Generated iOS app | `apps/client/ios/App/App.xcodeproj` | Capacitor UIKit host; currently contains only the `App` target |
| Native bridge/plugins | `apps/client/ios/App/CapApp-SPM/Package.swift` | Generated SPM bridge for Capacitor and seven runtime plugins |
| Synced native web bundle | `apps/client/ios/App/App/public/` | Generated copy of `dist`; refresh through `ios:sync`, never edit directly |
| Share integration guide | `apps/share-extension/README.md` | Required Xcode target, signing, App Group, URL route, consumer, and device-test steps |
| Share payload contract | `apps/share-extension/Sources/PendingImport.swift` | Versioned pending-import schema and bounded URL/text/image validation |
| Share controller scaffold | `apps/share-extension/Sources/ShareViewController.swift` | Extension-safe capture/copy flow and bilingual system-UI status; not compiled into a target |
| Share metadata/copy | `apps/share-extension/Resources/` | Unwired activation plist plus English and Simplified Chinese strings |
| Domain contract | `packages/recipe-domain/src/index.ts` | Production recipe/evidence invariants |
| Platform contract | `packages/platform-contracts/src/index.ts` | URLs, source bundles, jobs, errors, transitions |
| Data boundary | `packages/data-access/src/index.ts` | Repository interfaces and optimistic revision handling |
| Regression fixtures | `packages/test-fixtures/src/index.ts` | Eight scenario descriptors and a rich frozen fixture |
| Worker app | `services/ingestion-worker/src/recipe_worker/app.py` | FastAPI lifecycle and health endpoints |
| Worker pipeline | `services/ingestion-worker/src/recipe_worker/pipeline.py` | Stage machine, cancellation, heartbeats, fixture path |
| Acquisition boundary | `services/ingestion-worker/src/recipe_worker/adapters.py` | URL detectors; fixture works, live acquisition refuses |
| Provider boundary | `services/ingestion-worker/src/recipe_worker/providers.py` | ASR/OCR/extraction/translation protocols and fixture provider |
| Ephemeral storage | `services/ingestion-worker/src/recipe_worker/workspace.py` | Per-job workspaces, quota, cleanup, symlink safety |
| Database | `supabase/migrations/202608130001_core.sql` | Schema, RLS, buckets, policies, job claim, Realtime |
| Job creation | `supabase/functions/create-import-job/index.ts` | Authenticated validation, normalization, limits, queue insert |
| Cancellation | `supabase/functions/cancel-import-job/index.ts` | Authenticated cancellation with state-race handling |

## Architecture and data flow

### Implemented offline Fixture Demo

```text
Bundled fixture TS + /public/media SVGs
                 │
                 ▼
        Zustand fixture store
        ├─ simulated 700 ms job stages
        ├─ recipe/review mutations
        ├─ settings and cook completion
        └─ localStorage: mise-fixture-v1
                 │
                 ▼
 React pages → evidence review → recipe detail → cook mode
                 │
                 └─ production service worker caches app assets
```

The URL form validates only that a URL is HTTP(S), then clearly offers the
sample path. It performs no request. Upload/image/text buttons are placeholders.
Fixture job progress is a local timer, not worker status.

### Generated Capacitor shell and disconnected share scaffold

```text
apps/client/src + public
          │ pnpm --filter @mise/client ios:sync
          ▼
apps/client/dist
          │ cap sync ios
          ▼
apps/client/ios/App/App/public
          │
          ▼
CAPBridgeViewController WebView

apps/share-extension source/plist
          ╳ no Xcode target or target membership
intended App Group inbox
          ╳ no entitlements or host inbox consumer
Mise import route
          ╳ no registered URL type or host router
```

The generated shell packages the same web client and seven registered runtime
plugins. It does not add a live data path, replace the fixture store, or prove
native behavior. The shell has not been compiled, signed, launched, or tested.

The Share Extension scaffold is deliberately network-free: its source accepts
bounded HTTP(S) URLs, plain text, and image files; writes images before a
versioned `pending.json`; uses protected, backup-excluded App Group storage;
and requests `mise://import?pending=1` without placing shared content in the
deep link. Those behaviors are source-level intent only until Xcode integration
and testing. A Share Extension cannot rely on opening its host, so the source
also presents a localized instruction to open Mise manually when the
public-API request is denied.

### Intended production P0 path

```text
Authenticated client
  │
  ├─ Supabase repositories for owned recipes/jobs
  └─ Edge Function: create-import-job
          │
          ▼
   Supabase import_jobs queue
          │ claim_next_import_job(service role)
          ▼
   Ingestion worker
   URL adapter → ephemeral media → ASR/OCR/extraction
             → evidence alignment → bounded derived media
          │
          ├─ structured rows + evidence → PostgreSQL
          ├─ covers/keyframes/step clips → private recipe-media
          └─ expiring proxy → private temp-review
          │
          ▼
   job Realtime/read model → client review → versioned recipe
```

This production flow is a contract, not an operational path. Missing links
include authentication UI, client gateways, a production `JobReporter`, queue
polling, live acquisition, provider implementations, evidence alignment,
artifact upload, signed media delivery, and end-to-end deployment.

### Important model boundary

The current client uses `apps/client/src/data/types.ts` and its own fixtures.
It does not consume `@mise/recipe-domain`, `@mise/platform-contracts`,
`@mise/data-access`, or `@mise/test-fixtures`. Production integration must
converge these models rather than silently mapping incompatible fields.

## Storage and assets

### Static images and naming

- Source directory: `apps/client/public/media/`.
- Public runtime path: `/media/<name>.svg`.
- Recipe covers use kebab-case recipe subjects:
  `scallion-noodles.svg`, `tomato-pasta.svg`, `steamed-fish.svg`, and
  `lemon-cake.svg`.
- Step images use `step-<subject>.svg`:
  `step-scallions.svg`, `step-oil.svg`, `step-sauce.svg`,
  `step-noodles.svg`, and `step-pasta-pot.svg`.
- Covers are 800×600 (4:3); step illustrations are 800×450 (16:9).
- `public/favicon.svg` is the web/PWA icon. Vite copies all public assets to
  `apps/client/dist/` during build.
- Native static brand assets are generated by
  `apps/client/scripts/generate-ios-assets.mjs`:
  `AppIcon.appiconset/AppIcon-512@2x.png` is 1024×1024, while
  `Splash.imageset/splash-2732x2732.png` is 2732×2732 and is copied to the
  `-1` and `-2` filenames referenced by the 2x and 1x catalog entries.
- Run the generator through `pnpm --filter @mise/client ios:assets`; it writes
  under `apps/client/ios/App/App/Assets.xcassets/`. The fixed asset-only colors
  are terracotta `#B75235`, cream `#FFF8E9`, peach `#F2C9A9`, and dark text
  `#3A2C25`. They are not business-UI tokens; see `DESIGN_SYSTEM.md`.
- The populated native asset catalogs are generated inputs to Xcode and have
  not been validated in an iOS build.
- `ios:sync` then copies the built web artifact into
  `apps/client/ios/App/App/public/`. Both `dist/` and the native `public/`
  directory are generated outputs, not editing sources.
- Production object-path contract:
  `<owner-uuid>/<recipe-uuid>/<asset-kind>/<filename>`.

### Fonts and icons

- No webfont files or remote font requests exist.
- Sans stack: `-apple-system`, `BlinkMacSystemFont`, `"SF Pro Text"`,
  `"PingFang SC"`, `"Hiragino Sans GB"`, `"Noto Sans CJK SC"`,
  `"Segoe UI"`, `sans-serif`.
- Display stack: `ui-serif`, `"Iowan Old Style"`, `"Songti SC"`,
  `"Noto Serif CJK SC"`, `Georgia`, `serif`.
- Icons are named imports from `lucide-react`.
- The in-app Mise mark is composed in `AppLogo`; the favicon is a custom SVG.

### Browser state and caching

- Persistent fixture state is in browser `localStorage` under
  `mise-fixture-v1`: recipes, jobs, issues, collections, theme, locale, units,
  content-display preference, completed steps, and cache-clear timestamp.
- Search/filter/sort/view state, review selection, cook timers, and checked
  cook ingredients are component-local and do not persist.
- Cache Storage also uses the name `mise-fixture-v1` in a separate browser
  storage API. The service worker precaches the shell and fixture SVGs, uses a
  navigation network-first fallback, and cache-first behavior for other
  same-origin GETs.
- The static precache contains `/`, the manifest, favicon, and fixture SVGs.
  Generated hashed JavaScript/CSS are cached only when requested after the
  worker controls the page (and may also be in the browser HTTP cache); a
  build-aware bundle precache is still needed for a guaranteed first-install
  offline reload.
- Service-worker registration happens only in a production Vite build.
- The Settings “clear media cache” action currently records a timestamp only;
  it does not delete Cache Storage.
- React Query, Dexie/IndexedDB, and Supabase caches are not initialized.
- Capacitor Preferences and Filesystem are registered plugins, but the client
  does not call them. State remains in the web store/localStorage; native
  persistence and cache behavior have not been validated.

### Intended iOS shared-inbox storage (inactive)

- Proposed App Group identifier: `group.com.mise.recipes`.
- Proposed transaction paths:
  `<App Group container>/inbox/<uuid>/pending.json` and
  `<App Group container>/inbox/<uuid>/images/<random-name>.<extension>`.
- The source copies bounded images first and writes UTF-8, schema-version-1
  `pending.json` last so the future host can ignore incomplete transactions.
- The scaffold applies iOS data protection and excludes the inbox from backup.
  It performs no fetch, redirect resolution, parsing, authentication, upload,
  database write, or content logging.
- This storage is not active. The `App` target has no App Group entitlement,
  no extension target exists, and there is no host decoder/importer. The future
  host must treat every payload/file as untrusted, repeat schema/limit/path/type
  checks, reject symlinks and path escapes, process idempotently by UUID,
  garbage-collect incomplete/stale transactions conservatively, and remove
  completed or rejected data.

### Worker storage

- Per-job path: `<TEMP_ROOT>/<job-uuid>/`.
- Managed marker: `.mise-workspace.json`, mode `0600`; directories are `0700`.
- Workspaces are removed in `finally` on success, failure, and cancellation.
- Crash recovery removes only valid marked workspaces after the configured
  TTL, which is bounded to at most 24 hours.
- Raw source media must remain ephemeral and must never be uploaded to
  persistent Supabase storage.

### Supabase persistence

- PostgreSQL stores profiles, source attribution, recipes and immutable /
  working versions, ingredients, steps, transcripts, evidence, review issues,
  jobs, collections, and metadata.
- `recipe-media` is a private persistent bucket for source images, keyframes,
  covers, and bounded step clips.
- `temp-review` is a private temporary bucket for expiring review proxies.
- Every object path must begin with the authenticated owner UUID.
- Full raw source video is forbidden by the media model and lifecycle policy.

## API and local URLs

| Surface | URL or route | Current status |
|---|---|---|
| Vite dev | `http://localhost:5173` by default | Fixture client |
| Playwright server | `http://127.0.0.1:4173` | Test-only client |
| Root env worker example | `http://localhost:8787` | Reserved; client does not call it |
| Worker README/container | `http://localhost:8080` | Health service only |
| Worker liveness | `GET /health/live` | Implemented |
| Worker readiness | `GET /health/ready` | Implemented; live mode stays unready |
| Worker OpenAPI UI | `GET /docs` | Non-production only |
| Local Supabase example | `http://127.0.0.1:54321` | Requires Supabase CLI |
| Create job | `/functions/v1/create-import-job` | Implemented Edge Function, not called by client |
| Cancel job | `/functions/v1/cancel-import-job` | Implemented Edge Function, not called by client |
| Fixture pipeline | `fixture://scenarios/<scenario-id>` | Explicit non-network fixture scheme |
| Fixture attribution | `https://example.invalid/fixture/...` | Deliberately non-routable provenance placeholder |
| Capacitor WebView scheme | `mise` via `server.iosScheme` | Generated local WebView configuration; native shell unbuilt |
| Proposed pending-import request | `mise://import?pending=1` | Share scaffold constant only; app URL type and route are not registered |

The worker’s example ports are not aligned (`8787` at root, `8080` in the
worker). Resolve that during integration; neither value affects the Fixture
Demo today.

Do not confuse the configured Capacitor WebView scheme with completed host
deep-link handling. The Xcode URL Type and application router required by the
Share Extension remain absent.

## Environment variables

Purposes only are documented here. Never put values or credentials in project
documentation.

### Client-public and reserved client configuration

| Name | Purpose | Consumption |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser-safe Supabase project URL | Reserved; not read by client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser publishable key | Reserved; not read by client |
| `VITE_APP_ENV` | Client environment label | Reserved |
| `VITE_FIXTURE_MODE_ENABLED` | Intended explicit fixture-mode switch | Reserved; fixture mode is currently unconditional |
| `VITE_WORKER_PUBLIC_URL` | Intended public worker base URL | Reserved; no client call exists |
| `PROD` | Vite built-in production flag | Registers the service worker |

Only `VITE_*` variables may be exposed to browser code, and even those must not
contain secrets.

### Server, Edge Function, and orchestration configuration

| Name | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase API/project endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only administrative database/Auth access |
| `WORKER_INTERNAL_URL` | Reserved internal worker origin |
| `WORKER_SHARED_SECRET` | Reserved worker-to-orchestrator authentication secret; currently readiness-only |
| `UPLOAD_TOKEN_SECRET` | Reserved signing secret for a future upload flow |
| `ALLOWED_ORIGINS` | Exact comma-separated Edge Function CORS allowlist |
| `CREATE_IMPORT_RATE_LIMIT_PER_HOUR` | Per-user import creation ceiling |

### Worker configuration

| Name | Purpose |
|---|---|
| `ENVIRONMENT` | Development/test/staging/production behavior |
| `WORKER_MODE` | Selects fixture or live readiness mode |
| `WORKER_ID` | Stable worker identity for future job claims/heartbeats |
| `TEMP_ROOT` | Ephemeral per-job workspace root |
| `TEMP_DISK_LIMIT_GB` | Managed temporary disk cap |
| `RAW_MEDIA_TTL_HOURS` | Crash-recovery lifetime for raw workspaces, max 24h |
| `REVIEW_PROXY_TTL_HOURS` | Lifetime for temporary review proxies, max 24h |
| `JOB_TIMEOUT_SECONDS` | Intended processing timeout ceiling |
| `MAX_REDIRECTS` | Intended controlled redirect ceiling |
| `MAX_DOWNLOAD_BYTES` | Intended media response byte ceiling |
| `ASR_PROVIDER` | Speech-to-text provider selector |
| `ASR_API_KEY` | Server-only ASR credential |
| `OCR_PROVIDER` | OCR provider selector |
| `OCR_API_KEY` | Server-only OCR credential |
| `EXTRACTION_PROVIDER` | Recipe-structuring provider selector |
| `EXTRACTION_API_KEY` | Server-only extraction credential |
| `TRANSLATION_PROVIDER` | Translation provider selector |
| `TRANSLATION_API_KEY` | Server-only translation credential |
| `PLATFORM_COOKIE_FILE_PATH` | Optional server-only platform cookie file; not used by current adapters |
| `HTTP_PROXY` | Optional worker HTTP proxy |
| `HTTPS_PROXY` | Optional worker HTTPS proxy |
| `FIXTURE_MODE_ENABLED` | Allows the explicit fixture provider path |
| `PYTHONDONTWRITEBYTECODE` | Container setting that suppresses `.pyc` files |
| `PYTHONUNBUFFERED` | Container setting that emits worker logs without buffering |
| `PIP_DISABLE_PIP_VERSION_CHECK` | Container build setting that suppresses pip's version check |

The limit, proxy, cookie, timeout, and live-provider settings do not make live
acquisition operational; the transport and provider implementations are still
absent.

### Tooling and test process

| Name | Purpose |
|---|---|
| `CHROME_PATH` | Optional Chrome executable override for the iOS asset renderer |
| `CI` | Enables Playwright retries, forbids focused tests, and avoids server reuse |

## Build outputs and deployment targets

- `pnpm build` recursively runs available builds. At present, only the client
  has a build script.
- Client output: `apps/client/dist/`, a static Vite/PWA artifact suitable for
  an HTTPS static host with SPA fallback to `index.html`.
- Shared packages are source-consumed and have typecheck/test scripts but no
  package build output.
- Worker targets: a Python wheel through Hatch and a Docker image exposing
  port 8080. No hosting platform is configured.
- Supabase targets: PostgreSQL migration, Edge Functions, private Storage, and
  Auth in a Supabase project. Deployment config is not present.
- `pnpm --filter @mise/client ios:assets` writes the app-icon PNG and three
  splash PNGs directly into `apps/client/ios/App/App/Assets.xcassets/`; it
  requires the configured Chrome executable but does not require Xcode.
- `pnpm --filter @mise/client ios:sync` runs the web build and updates the
  generated Xcode project’s web assets, config, and SPM plugin references under
  `apps/client/ios/`.
- The generated Capacitor project is a source/build target, not a validated
  native artifact. Producing a simulator/device `.app` or archive requires
  macOS, a compatible Xcode installation, resolved Swift packages, and signing
  configuration; none has been produced in this environment.
- `apps/share-extension/` is not a build target and currently produces no
  `.appex`. Running `ios:sync` does not wire it into Xcode.

## Implementation boundaries

### Non-negotiable truth and provenance

- Keep `fixture://` and local sample output explicitly marked as fixture data.
- Never turn a pasted URL into simulated “live” success without a real,
  auditable acquisition path.
- Preserve original text and source units; translations are additive.
- Unknown amounts remain unknown/null. AI suggestions must be labeled and
  must not overwrite source facts.
- Keep immutable source snapshots separate from editable working/personal
  versions.
- Every ingredient and step assertion must retain evidence state and source
  references where available.

### Security and storage

- Never ship service-role keys, worker secrets, provider keys, cookies, or
  user JWTs to the browser.
- Keep RLS and owner checks on every user-data boundary.
- URL syntax validation is not SSRF protection. A live transport must
  revalidate every redirect, check all DNS answers, reject non-global IPs,
  pin the validated address while preserving TLS hostname, cap bytes/time/
  redirects/types, and avoid forwarding credentials.
- Never persist full downloaded source media. Persist only source attribution,
  structured data, evidence, keyframes, bounded clips, and expiring review
  proxies.
- Logs must exclude secrets, full query strings, transcripts, and raw user
  content.

### Native and Share Extension boundary

- Keep the phrases **Capacitor shell generated** and **native/share integration
  incomplete** together in status reporting.
- Do not call the Share Extension implemented, installed, available, or usable
  until an Xcode target embeds a compiled `.appex` and the complete host path
  has passed simulator/device testing.
- Required native work still includes target membership and plist/localization
  resources; matching signing/team and App Group entitlements/provisioning on
  app and extension; host URL registration/routing; embedding the extension;
  a foreground-aware, idempotent inbox decoder/import UX; revalidation,
  retention, and cleanup; and archive/device tests.
- The share process must remain a narrow intake boundary. It must not fetch
  shared URLs, parse social pages, use cookies/credentials, upload media, or
  write product data. Acquisition belongs to the host/worker after explicit
  import handling.
- The host must not trust a payload because it came from the shared container.
  Repeat bounds and file validation, avoid symlink/path traversal, and strip
  image metadata before any future network use when policy requires it.
- `NSExtensionContext.open` is best effort for a Share Extension. Do not add
  unsupported `UIApplication.shared` or responder-chain workarounds.
- The fixed brand hex palette is limited to generated native/raster/SVG assets
  that cannot resolve CSS custom properties. WebView and business UI must
  continue to use semantic design tokens; do not turn the asset fallback
  colors into a parallel component palette.

### Scope order

1. P0: one real, compliant media acquisition path.
2. P0: ASR/OCR/extraction/evidence alignment with schema validation.
3. P0: queue reporting, persistence, private media delivery, and client review.
4. P0: explicit live/fixture selection and unambiguous status/error UX.
5. P1 only after the loop works: broader adapters, richer organization,
   validation/integration of the generated native shell and share scaffold,
   and secondary polish.

## Testing and verification commands

These commands describe the repository; they were not run during this
documentation-only update.

```sh
# Workspace
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm check

# Client only
pnpm --filter @mise/client test
pnpm --filter @mise/client test:e2e

# Regenerate native app-icon and splash catalogs (Chrome required)
pnpm --filter @mise/client ios:assets

# Rebuild and synchronize the generated Capacitor iOS project
pnpm --filter @mise/client ios:sync

# macOS with compatible Xcode only
pnpm --filter @mise/client ios:open

# Individual shared packages
pnpm --filter @mise/recipe-domain test
pnpm --filter @mise/platform-contracts test
pnpm --filter @mise/data-access test
pnpm --filter @mise/test-fixtures test

# Worker, after installing its dev extras
cd services/ingestion-worker
pytest
ruff check .
mypy src
python -m compileall src tests
docker build -t mise-ingestion-worker .

# Supabase foundation
supabase start
supabase db reset
supabase functions serve create-import-job --env-file supabase/.env.local
supabase functions serve cancel-import-job --env-file supabase/.env.local
```

The repository has no working Share Extension build command because the
scaffold is not an Xcode target. On macOS, follow
`apps/share-extension/README.md`, then build/test the app and extension from
Xcode. Native compilation, simulator/device behavior, signing, and archive
validation remain unperformed.

## Iteration log

Newest first:

- **2026-08-13 — Reproducible iOS brand assets:** added and documented the
  Playwright/Chrome generator, `ios:assets` command, populated app-icon/splash
  catalogs, and asset-only fallback palette. The native project remains
  unbuilt and unvalidated in Xcode.
- **2026-08-13 — iOS documentation synchronization:** updated all Web Coder
  handoff files to distinguish the generated Capacitor shell from incomplete
  native/share integration; no tests or native builds were run.
- **2026-08-13 — Capacitor and share scaffolding:** generated the iOS 15
  Capacitor 8 project with seven SPM runtime plugins and added a bounded,
  bilingual Share Extension source/plist scaffold. The shell remains unbuilt,
  and the extension remains outside Xcode with no entitlements or host
  consumer.
- **2026-08-13 — Documentation synchronization:** established an honest root
  README plus Web Coder context, overview, and design-system sources of truth.
- **2026-08-13 — Worker safety foundation:** added health/readiness checks,
  strict configuration, platform detectors, fixture-only providers, staged
  pipeline behavior, cancellation/heartbeat protocols, and bounded ephemeral
  workspaces. Live acquisition remains an explicit failure.
- **2026-08-13 — Supabase foundation:** added the normalized schema, RLS,
  private media buckets, job-claim RPC, Realtime publication, and authenticated
  create/cancel function boundaries.
- **2026-08-13 — Shared contracts and fixtures:** added production Zod domain,
  platform/job contracts, repository boundaries, standardized errors, and
  eight PRD fixture scenarios.
- **2026-08-13 — Offline product loop:** built the bilingual responsive client
  with fixture import, evidence review, library, recipe detail, cook mode,
  collections, themes, persistent local state, and production PWA caching.
