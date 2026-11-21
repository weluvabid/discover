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
- `features/search/` owns search hooks and pure search/filter functions.
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

Astro filesystem routes provide `/`, `/trending`, `/hidden-gems`, `/collections`, `/library`, and `/search`. Genre and play-style filters are reflected in the URL and constrain every Explore context. Twelve catalog play styles can be selected to tailor affinity and relevance scores; the ranking explanation shows how the selected profile contributes. Search results prioritize title and creator matches before popularity. See [the ranking architecture](docs/architecture/discovery-ranking.md) for eligibility rules, scoring, explainability, and the mock-data boundary.

## Frontend platform

Discover uses Astro for filesystem routing and document composition, with the interactive discovery application hydrated as a single React island. ReUI is the primary component ecosystem using the Base UI + Maia style. Shared primitives and selected ReUI compositions are integrated across discovery controls, ranking explanations, experience details, filters, navigation actions, and empty states.

## Backend catalog pipeline

See [Backend data pipeline](docs/architecture/backend-data-pipeline.md) for the SQLite schema, Roblox enrichment, deterministic synthetic metrics, Turso synchronization and API contract. Copy `.env.example` to `.env`, configure the Turso token only when you are ready to sync, then run `pnpm api:build` and `pnpm db:ingest -- --limit 100` for the first ingestion smoke test.


## Frontend and API integration

The static frontend calls the Discover API for catalog search and all five ranked discovery contexts. In local development, start the API and Astro in separate terminals:

```bash
pnpm api:dev
pnpm dev
```

The API listens on `http://127.0.0.1:8787` by default. The frontend uses that origin automatically in Astro development. For a separately hosted frontend, bind the API process to `HOST=0.0.0.0`, set `PUBLIC_DISCOVER_API_URL` to the API origin including `/api` (for example, `https://api.example.com/api`) at build time and configure the API's `CORS_ORIGIN` for the frontend origin.

When `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are present, the API hydrates its local SQLite read model from the synchronized Turso catalog before accepting requests. This keeps ranking computation local to the API process while Turso remains the remote catalog source. Run `pnpm db:sync` after local ingestion changes, then restart the API to refresh its read model.

## Testing the local catalog

The normal `pnpm test` suite uses isolated in-memory fixtures and does not require the local catalog or Turso credentials. It includes adversarial API tests for SQL wildcard/injection payloads, malformed ranking configuration, hostile pagination values, oversized search input, unavailable records, and filtered pagination totals.

Run the read-only acceptance suite against the actual local SQLite catalog:

```bash
pnpm test:acceptance
```

The command reads `DATABASE_PATH` from the process environment or `.env`, defaulting to `data/roblox-games.db`. The acceptance suite opens the database in read-only mode and verifies SQLite integrity, foreign keys, the Catalog v1 row counts, uniqueness, metadata and synthetic metric bounds, snapshot consistency, all five discovery contexts, persona requests, catalog pagination, search, and detail lookups. Set `DATABASE_PATH=/absolute/path/to/roblox-games.db` to target another local copy.


### Ranking performance

The API uses four ranking workers by default. Set `RANKING_WORKERS=0` to run the synchronous baseline, or provide another worker count when reproducing the benchmark. SQLite catalog reads remain on the HTTP thread.

See [Moving discovery ranking off the HTTP thread](docs/architecture/ranking-worker-investigation.md) for the reason behind the change, benchmark results, memory trade-offs, and reproduction commands.
