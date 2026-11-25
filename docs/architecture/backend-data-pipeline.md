# Discover legacy backend and catalog pipeline

> This document describes the retained, deprecated SQLite/Turso ingestion system. It is not part of the active application request path. The old database-backed API returns HTTP 501 (`LEGACY_CATALOG_UNSUPPORTED`). The active server-side RoTunnel provider is documented in [Live Roblox discovery provider](live-roblox-provider.md).

## Data flow

```text
Pinned source CSV (9,734 game rows)
  -> streaming RFC-4180 parser
  -> URL / place ID / universe ID validation
  -> idempotent SQLite upsert (universe ID primary key)
  -> Roblox Games API + thumbnail enrichment (50 IDs per request)
  -> deterministic synthetic engagement + persona affinities
  -> historical metric snapshots
  -> optional Turso sync
  -> lightweight JSON API handler over Node HTTP
  -> existing discovery ranking engine
```

The source is pinned to commit `fde27463363626e863e4b501c20ed0072f60e43e`. It contains 9,735 lines including the header (9,734 source records). Source metrics are observations fetched on 2024-11-05; they are not presented as current Roblox metrics. Roblox API enrichment refreshes metadata, active players, visits, favorites and artwork at ingestion time.

## Local database

The default database is `data/roblox-games.db` (SQLite, WAL mode). Schema bootstrap is idempotent and records baseline version 1 in `schema_migrations`. `DATABASE_PATH` can override it. `games.universe_id` is the canonical primary key. `game_metric_snapshots` keeps dated source observations. `ingestion_runs` and `ingestion_errors` preserve run-level and row-level outcomes. The source data and synthetic estimates are stored in separate columns; synthetic metrics are never represented as Roblox telemetry. The source CSV exposes likes and dislikes rather than review totals, so the imported `reviewCount` is a reaction-count proxy used by the existing Featured threshold. The CSV abbreviates large values with `+`; those values are parsed as lower-bound estimates. The derived source rating is a smoothed likes/dislikes ratio with a neutral prior, not an official Roblox rating.

## Synthetic data

Synthetic values are deterministic for a fixed `(SYNTHETIC_SEED, universe_id, source-metric input)` tuple. Refreshing Roblox player counts or ratings can therefore produce a new reproducible estimate. Twelve seeded archetypes have different genre preferences. Session duration, retention, repeat-play and persona affinity share quality, demand and genre inputs; D7 is bounded by D1 and D30 by D7. These are simulated ranking inputs, not measurements of actual players. Changing the seed regenerates the estimates reproducibly.

## Roblox ingestion

The importer reads the CSV as a byte stream and parses one row at a time. It flushes batches of 50, deduplicates by universe ID, fetches details and icons in Roblox-supported batches, retries transient failures and records unavailable games without discarding their source row. Invalid IDs and malformed required fields are recorded in `ingestion_errors`.

The API endpoints used are `games.roblox.com/v1/games?universeIds=...` and `thumbnails.roblox.com/v1/games/icons?universeIds=...`. Roblox requests are made only during ingestion, never in the request-serving path.

## Turso

Turso receives idempotent JSON snapshots in `discover_games` and `discover_metric_snapshots`, plus a sync cursor in `discover_sync_state`. The local SQLite database remains the ingestion source of truth. Configure `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` locally; the token is never committed. Sync uses the libSQL Hrana HTTP pipeline directly and does not add a runtime dependency.

## Commands

These commands describe the historical pipeline. Its scripts are retained under `scripts/deprecated/` and are no longer wired into the active package scripts or server build. The active API is started with `pnpm api:dev` or `pnpm api:start`.

`--no-enrich` is intended only for parser/import smoke tests; those rows remain pending and are not exposed by the API until enriched.

## Historical API contract

The following routes describe the retired SQLite-backed API, not the active live API:

- `GET /api/health`
- `GET /api/experiences?limit=100&offset=0&q=...&genre=...`
- `GET /api/experiences/:universeId`
- `GET /api/search?q=...`
- `GET /api/personas`
- `POST /api/discover/:context`

The old `handleApiRequest` entry point now returns HTTP 501 (`LEGACY_CATALOG_UNSUPPORTED`). The active routes are implemented by `src/server/api/routes/get.ts` and `post.ts` behind `handleLiveRequest`; see [Live Roblox discovery provider](live-roblox-provider.md) for the current contract and data path.
