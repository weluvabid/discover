# Discover

A Roblox-inspired experience discovery prototype exploring personalized discovery, search, ranking, and explainable recommendations.

## Stack

- Astro 7 + React 19 + TypeScript
- Tailwind CSS 4
- ReUI (Base UI + Maia)
- Lucide React
- Vitest + Testing Library
- pnpm 12

## Requirements

- Node.js `26.13.0` (see `.node-version`)
- pnpm `12.0.0` (see `packageManager` in `package.json`)

## Development

```sh
pnpm install
pnpm dev
```

## Architecture

The application is organized around feature ownership rather than a single global component or stylesheet:

- `src/app/` owns the application composition.
- `src/components/layout/`, `src/components/discovery/`, `src/components/experience/`, and `src/components/pages/` contain focused presentation components.
- `src/features/search/` owns pure search and filtering functions.
- `src/features/discovery/engine/` contains the framework-independent ranking model and algorithms.
- `src/features/discovery/hooks/` owns discovery-page state and orchestration.
- `src/server/` owns the live API boundary, RoTunnel provider, enrichment and process-local caches.
- `src/deprecated/` contains the retired SQLite/Turso ingestion and worker-pool implementation.
- Component-owned styles live beside their component areas. `styles/index.css` preserves the cascade order and imports the small global foundation plus those feature styles.

## Quality checks

```sh
pnpm check
```

This runs TypeScript, ESLint, Prettier, Vitest, and the production build.

## Discovery architecture

Explore is powered by one shared, explainable ranking engine with five separate contexts: Featured, Trending, Recommended, Hidden Gems, and Recently Launched. Context eligibility is evaluated before ranking; user preferences affect ordering within eligible candidate pools. Ranked results expose weighted signal contributions and any diversity reranking adjustment through the **Why this result?** popover.

Astro filesystem routes provide `/`, `/trending`, `/hidden-gems`, `/library`, and `/search`. Genre and play-style filters are reflected in the URL and constrain every Explore context. Twelve catalog play styles can be selected to tailor affinity and relevance scores; the ranking explanation shows how the selected profile contributes. Search uses Roblox Omni Search for candidate acquisition, then applies deterministic query relevance and the shared ranking engine; relevance remains the dominant signal, while persona and configured quality/popularity/freshness preferences provide secondary ordering. Explicit player, rating, vote and date sorts remain available. See [the ranking architecture](docs/architecture/discovery-ranking.md) for eligibility rules, scoring, explainability, and the mock-data boundary.

## Frontend platform

Discover uses Astro for filesystem routing and document composition, with the interactive discovery application hydrated as a single React island. ReUI is the primary component ecosystem using the Base UI + Maia style. Shared primitives and selected ReUI compositions are integrated across discovery controls, ranking explanations, experience details, filters, navigation actions, and empty states.

## Active backend: live Roblox data

The active application uses the live RoTunnel provider. The browser calls the configured Discover API base (`PUBLIC_DISCOVER_API_URL`; local development defaults to `http://127.0.0.1:8787/api`). The server fetches Roblox Explore, Omni Search, game metadata, votes and artwork, normalizes the response into the existing `Experience` model, and passes discovery, genre and search candidates through the same ranking engine. Search adds deterministic lexical query relevance; genre browsing applies the active persona and ranking preferences. No database or analytics are in the active request path. See [Live Roblox provider](docs/architecture/live-roblox-provider.md) for endpoint boundaries, caching, failure handling and deployment details.

The Astro frontend is built as a static site. The live API uses the same `handleLiveRequest` HTTP boundary in both local development and production:

- Locally, `pnpm api:dev` runs the Node HTTP server from `src/server/live-index.ts`.
- On Vercel, `api/[path].ts`, `api/discover/[context].ts`, and `api/experiences/[id].ts` expose the same handler through Vercel Node.js Functions. The frontend uses the same-origin `/api` base by default, so no production `PUBLIC_DISCOVER_API_URL` is required.

For local development, run the live API and Astro in separate terminals:

```bash
# Terminal 1
pnpm api:dev

# Terminal 2
pnpm dev
```

The live API listens on `http://127.0.0.1:8787` by default. Astro development uses that origin automatically. `CORS_ORIGIN` is only needed if the frontend and API are served from different local origins.

## Vercel deployment

Import this repository as a Vercel project using the repository root as the project root. Keep the default Astro build settings:

- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `dist`

Vercel detects the root `api/` directory and deploys its Node.js Functions separately from the static Astro output. The three entry points cover single-segment API paths, discovery-context paths, and experience-detail paths; each forwards the original request to `handleLiveRequest`, so API route logic is not duplicated.

Leave `PUBLIC_DISCOVER_API_URL` unset (or empty) for same-origin `/api` routing. Set `CORS_ORIGIN` only when allowing additional browser origins; same-origin production requests do not require CORS. Do not put upstream credentials or private values in `PUBLIC_*` variables.

Ensure the `brand` Git submodule is checked out during the Vercel clone/build. The `pnpm build` command synchronizes its SVG assets into Astro's `public/` directory before the static build.

## Retained legacy catalog pipeline

The previous SQLite/Turso ingestion pipeline, synthetic metric generation, ranking worker pool and database-backed API are retained as deprecated reference code. They are isolated under `src/deprecated/` and are excluded from the active API build. The original implementation and its tests remain there for historical reference. See [Legacy backend data pipeline](docs/architecture/backend-data-pipeline.md) for its historical design.

## Testing

The normal `pnpm test` suite uses isolated fixtures and does not require a live RoTunnel connection or local database. It tests active API routing, response normalization, ranking behavior and frontend behaviour. Historical SQLite/Turso tests are kept under `src/deprecated/` and excluded from the default suite.

### Legacy ranking performance

The historical database-backed API used four ranking workers by default. The active live API server runs the existing ranking engine in-process; the old worker pool remains only for legacy benchmarks and reference.

See [Moving discovery ranking off the HTTP thread](docs/architecture/ranking-worker-investigation.md) for the historical investigation and benchmark results.

## Evaluating play-style recommendations

The historical persona evaluator and its SQLite dependencies are retained under `scripts/deprecated/` and `src/deprecated/`. They are not part of the active application workflow.
