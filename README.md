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

- `app/` owns the application composition.
- `components/layout/`, `components/discovery/`, `components/experience/`, and `components/pages/` contain focused presentation components.
- `features/search/` owns pure search and filtering functions.
- `features/discovery/engine/` contains the framework-independent ranking model and algorithms.
- `features/discovery/hooks/` owns discovery-page state and orchestration.
- `data/mocks/experiences.ts` contains catalog records; `data/mocks/catalog.ts` contains derived catalog collections and lookup helpers.
- Component-owned styles live beside their component areas. `styles/index.css` preserves the cascade order and imports the small global foundation plus those feature styles.

## Quality checks

```sh
pnpm check
```

This runs TypeScript, ESLint, Prettier, Vitest, and the production build.

## Discovery architecture

Explore is powered by one shared, explainable ranking engine with five separate contexts: Featured, Trending, Recommended, Hidden Gems, and Recently Launched. Context eligibility is evaluated before ranking; user preferences affect ordering within eligible candidate pools. Ranked results expose weighted signal contributions and any diversity reranking adjustment through the **Why this result?** popover.

Astro filesystem routes provide `/`, `/trending`, `/hidden-gems`, `/collections`, `/library`, and `/search`. Genre and play-style filters are reflected in the URL and constrain every Explore context. Twelve catalog play styles can be selected to tailor affinity and relevance scores; the ranking explanation shows how the selected profile contributes. Search uses Roblox Omni Search and preserves its native order by default, with optional sorting by live players, vote-derived rating, vote count, and timestamps. See [the ranking architecture](docs/architecture/discovery-ranking.md) for eligibility rules, scoring, explainability, and the mock-data boundary.

## Frontend platform

Discover uses Astro for filesystem routing and document composition, with the interactive discovery application hydrated as a single React island. ReUI is the primary component ecosystem using the Base UI + Maia style. Shared primitives and selected ReUI compositions are integrated across discovery controls, ranking explanations, experience details, filters, navigation actions, and empty states.

## Active backend: live Roblox data

The active application uses the live RoTunnel provider. The browser calls the configured Discover API base (`PUBLIC_DISCOVER_API_URL`; local development defaults to `http://127.0.0.1:8787/api`). The server fetches Roblox Explore, Omni Search, game metadata, votes and artwork, normalizes the response into the existing `Experience` model, and passes candidates to the existing ranking engine. No database or analytics are in the active request path. See [Live Roblox provider](docs/architecture/live-roblox-provider.md) for endpoint boundaries, caching, failure handling and deployment details.

The Astro frontend remains static and the live API runs as a separate Node HTTP process through `src/server/live-index.ts`. This repository is an offline development project; it does not currently include a Vercel function adapter or deployment configuration. Any future hosting adapter should reuse `handleLiveRequest` rather than fork the API implementation.

For local development, run the live API and Astro in separate terminals:

```bash
# Terminal 1
pnpm api:dev

# Terminal 2
pnpm dev
```

The live API listens on `http://127.0.0.1:8787` by default. Astro development uses that origin automatically. `CORS_ORIGIN` is only needed if the frontend and API are served from different local origins.

## Hosting boundary

No hosting provider is configured in this repository. The frontend is built as a static Astro site and the API is a separate Node process. Keep that boundary explicit until a hosting target is selected; do not add provider-specific adapters or caching configuration prematurely.

## Retained legacy catalog pipeline

The previous SQLite/Turso ingestion pipeline, synthetic metric generation, ranking worker pool and database-backed API are retained as deprecated reference code. They are isolated under `src/deprecated/` and are excluded from the active API build. The original implementation and its tests remain there for historical reference. See [Legacy backend data pipeline](docs/architecture/backend-data-pipeline.md) for its historical design.

## Testing

The normal `pnpm test` suite uses isolated fixtures and does not require a live RoTunnel connection or local database. It tests active API routing, response normalization, ranking behavior and frontend behaviour. Historical SQLite/Turso tests are kept under `src/deprecated/` and excluded from the default suite.

### Legacy ranking performance

The historical database-backed API used four ranking workers by default. The active live API server runs the existing ranking engine in-process; the old worker pool remains only for legacy benchmarks and reference.

See [Moving discovery ranking off the HTTP thread](docs/architecture/ranking-worker-investigation.md) for the historical investigation and benchmark results.

## Evaluating play-style recommendations

The historical persona evaluator and its SQLite dependencies are retained under `scripts/deprecated/` and `src/deprecated/`. They are not part of the active application workflow.
