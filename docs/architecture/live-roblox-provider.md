# Live Roblox discovery provider

## Active request path

```text
Astro static frontend
  -> local API origin (/api/*)
  -> Node HTTP adapter (src/server/live-index.ts)
  -> live application handler
  -> RoTunnel client
  -> Explore / Omni Search candidates
  -> batched game details, votes and icons
  -> Experience normalization
  -> existing persona and ranking engine
  -> existing API response shape
```

The browser never calls RoTunnel. RoTunnel requests are server-side so upstream hosts, response validation, timeouts and error mapping stay behind the API boundary. No API key is currently required by the RoTunnel host-replacement convention; if that changes, credentials belong in server-only environment variables.

## Provider boundaries

The RoTunnel provider is split by responsibility under `src/server/providers/rotunnel/`:

- `client.ts` owns endpoint calls, query construction, batching and bounded search pagination.
- `transport.ts` owns HTTP timeouts, retries, response decoding and upstream error mapping.
- `response-parsers.ts` owns defensive extraction of sort and candidate envelopes plus primitive value parsing.
- `normalize-experience.ts` maps provider data into the shared `Experience` contract.
- `sort-selection.ts` maps discovery contexts to native Explore sorts and extracts candidate IDs.
- `types.ts` and `urls.ts` own provider contracts and upstream origins.

`src/server/api/rotunnel.ts` remains a small compatibility facade for existing imports; new server code should import from `src/server/providers/rotunnel/` directly. The provider does not import the ranking engine.

`src/server/api/live-app.ts` is the HTTP boundary: CORS, method dispatch and normalized error handling. Route implementations live in `src/server/api/routes/get.ts` and `post.ts`. Candidate retrieval, enrichment caching and search-feed loading live in `src/server/services/discovery-data.ts`; experience enrichment/persona application live in `experience-enrichment.ts`; search ordering lives in `search-sorting.ts`; response serialization lives in `src/server/api/http/json-response.ts`. `src/server/live-index.ts` adapts the handler to the local Node HTTP server. The repository currently runs the API as a separate local Node process; it does not contain an active Vercel function adapter.

The provider keeps `Experience.source.sortId` and `Experience.source.nativePosition`. The ranking engine may reorder a result, but the original Roblox feed identity and ordinal remain available for side-by-side comparison.

The `/api/genres` counts are counts within the currently retrieved Top Trending sample, not totals across the Roblox catalog. `/api/experiences` likewise returns the bounded live candidate sample rather than claiming to enumerate every Roblox experience.

## Real-data boundary

Only values returned by Roblox are populated:

- `activePlayers` from the live playing/player count.
- `rating` from `upVotes / (upVotes + downVotes)` when both counts exist and the denominator is non-zero.
- `voteCount` from the total up/down votes.
- `visits`, `favorites`, creation/update timestamps, creator metadata and artwork from their respective Roblox endpoints.

Roblox does not expose the old synthetic retention, repeat-play, average-session, average-playtime or week-over-week metrics through these public endpoints. Those fields remain absent in the live provider. The UI displays unavailable values rather than fabricated zeroes. The ranking engine redistributes each candidate's configured weight across signals for which that candidate has actual data; missing evidence is not treated as a score of zero.

The existing genre taxonomy is an application classification, not a Roblox-provided taxonomy. `src/domain/taxonomy/genre-classifier.ts` applies deterministic weighted rules to native genre metadata, title and a bounded description prefix. Specific title concepts outweigh incidental description mentions; generic values such as `All` and `Unknown` are discarded. The classifier records `genreConfidence`; low-confidence and unclassified experiences do not receive an inferred genre tag or same-genre similarity bonus. Genuinely unclassified experiences retain the legacy `Exploration` display value for API compatibility but are marked `unknown` and receive an `Unclassified` subgenre. Generic tags are excluded from diversity similarity. No ML model or runtime classifier dependency is required.

## Discovery feeds and native-order comparison

The provider discovers available Explore sorts at runtime, selects the closest native sort for each existing context, and stores the chosen sort ID and native position on each experience. The current context mapping is intentionally isolated in `selectSortForContext`. When a dedicated context sort is missing or renamed, the provider falls back to Top Trending (or the first available sort) rather than breaking the entire discovery page; the actual selected sort ID remains attached to every result so the fallback is explicit and native-order comparisons remain interpretable. Explore and Omni Search are undocumented response contracts. The adapter therefore handles known response envelopes defensively and the tests use captured-shape fixtures. Before release, run the smoke probes against the live RoTunnel hosts and update fixtures if Roblox changes its envelope. A successful build does not prove that an undocumented upstream endpoint is currently available.

## Failure handling and load control

- Upstream requests have a five-second timeout and at most one bounded retry for 429/5xx or transport failures.
- Metadata, vote and icon enrichment run concurrently and are best-effort; valid discovery candidates survive a partial enrichment failure.
- Explore sort lists, candidate feeds, search results and individual detail/vote/icon lookups use a bounded process-local LRU/TTL cache with request coalescing; cache loss on cold starts is expected and does not affect correctness.
- Candidate pools are capped at 100 before enrichment; metadata/vote/icon requests are batched in groups of 50.
- Search follows at most three Omni Search pages per query.
- Upstream 429 becomes a 503 to the frontend; other upstream failures become 502 with a stable error code.
- No SQLite/Turso access, worker threads, event collection or background ingestion occurs in the active request path.

## Runtime and deployment boundary

The repository currently contains an Astro static frontend and a separately started Node HTTP API. `pnpm api:dev` builds and watches the API; `pnpm dev` starts Astro. There is no checked-in Vercel function adapter or deployment configuration in this offline repository. A future hosting adapter should call `handleLiveRequest` rather than duplicate route logic. The server-only dependency graph must remain isolated from the browser build.

## Legacy catalog

The SQLite/Turso ingestion, synthetic-data generation, local Node server and worker-pool code remain in the repository for reference and future evolution. They are not included in the active live API build. The old `handleApiRequest` entry point now returns HTTP 501 with `LEGACY_CATALOG_UNSUPPORTED`; its original implementation lives in `src/deprecated/server/api/legacy-app.ts` and its tests remain attached to that implementation.
