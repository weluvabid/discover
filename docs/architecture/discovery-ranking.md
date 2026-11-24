# Discover ranking architecture

> The current request path uses live RoTunnel candidates through the standalone Node API process. The SQLite/catalog and synthetic-metric details later in this document describe the retained legacy implementation unless explicitly stated otherwise. See [Live Roblox provider](live-roblox-provider.md) for the active data path.

## Pipeline

Discover uses one deterministic ranking engine with independent discovery contexts:

1. Candidate retrieval (the mock catalog today).
2. Context eligibility.
3. Signal computation and normalization.
4. Context-adjusted weighted scoring.
5. Diversity-aware greedy reranking.
6. Explanation construction.
7. Section rendering.

Eligibility is separate from ranking. A strong score cannot make an experience qualify for Trending, Hidden Gems, or Recently Launched if it does not satisfy that context's eligibility rule.

## Context eligibility

| Context           | Eligibility                                                | Ranking intent                                       |
| ----------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Featured          | Rating >= 85 and at least 100 reviews                      | Select one strongest overall match                   |
| Trending          | Positive week-over-week player change                      | Preserve momentum while personalizing order          |
| Recommended       | General catalog                                            | Full personalized ranking                            |
| Hidden Gems       | At most 10,000 active players and rating >= 88             | Prefer affinity and quality; down-weight popularity  |
| Recently Launched | Published from 0 through 30 days before the injected clock | Preserve recency eligibility, then rank by relevance |

The 30-day window and thresholds are explicit policy values, not learned model parameters. The catalog ranking clock defaults to the latest `source_date_fetched` value across the local catalog, so launch and update recency are evaluated against the dataset observation window.

## Signals

The shared model retains six normalized signals: affinity, engagement quality, relevance, freshness, popularity, and diversity. User-selected weights are normalized to 100 across enabled signals. Each context applies a multiplier profile to those weights and renormalizes the effective weights before scoring.

The weighted score is:

`weightedScore = sum(normalizedSignal * effectiveWeight)`

The second-stage reranker uses genre similarity and Jaccard similarity over semantic metadata tags to apply a bounded ordering penalty. The normalized genre label is removed from each tag set before Jaccard is computed because genre is already scored independently; specific native metadata such as `FPS` remains eligible, while the broad Roblox `Town and City` category is excluded. This prevents a generated genre tag from counting the same evidence twice. Its strength is derived from the configured diversity signal's context-adjusted effective weight relative to the default configuration. Setting diversity to zero disables both the rarity contribution and the greedy reranking penalty; increasing the configured weight increases the penalty monotonically, up to the bounded maximum. Candidate-pool expansion uses the same maximum penalty budget, so a candidate capable of overtaking the retained cutoff is not discarded. The raw penalty and the applied score adjustment are exposed separately. If a score is already at zero, the score adjustment is floored at zero while the raw penalty still explains the ordering decision, so arithmetically:

`finalScore = weightedScore + appliedDiversityAdjustment`

Signal contributions reconcile to `weightedScore`; the final score reconciles after the explicit reranking adjustment.

## Explainability

Every ranked item carries its context, final score, weighted score, diversity adjustment, raw and normalized signal values, effective weights, weighted contributions, eligibility evidence, and top contributing reasons. The UI renders this evidence in a portal-backed popover so it does not change card or row layout and is not clipped by card overflow.

## Time and determinism

Ranking accepts an injected `Date`. When no clock is supplied, the engine uses the catalog-wide maximum `source_date_fetched` timestamp attached to catalog records. The Explore page can still inject one clock value for a ranking snapshot so all five contexts use the same temporal boundary. Invalid publication dates do not qualify for Recently Launched. Future-dated experiences are excluded from that context. Stable ID tie-breaking makes equal-score results deterministic.

## Current data boundary

The browser calls our same-origin API; the server retrieves live Roblox candidates through RoTunnel and sends normalized `Experience` values into this engine. The provider retains each candidate's native sort ID and original Roblox position so the response can compare the Discover position with Roblox's position.

Live values include current players, vote-derived positive percentage, vote count, visits, favorites, creator metadata, artwork and timestamps when supplied. Roblox's public endpoints do not supply the old synthetic D1/D7/D30 retention, repeat-play, average-session, average-playtime or week-over-week growth values. The live adapter leaves these fields absent. The engine disables a signal for a candidate when the data required by that signal is unavailable, then renormalizes that candidate's remaining effective weights. Missing data is not represented as zero or synthetic telemetry. For live rating-only candidates, quality uses the one-sided 95% Wilson lower confidence bound when vote count is available, reducing the influence of ratings supported by very few votes; when vote count is unavailable, the raw rating remains available without an invented sample size. The application genre is a deterministic mapping into Discover's taxonomy, not a native Roblox genre taxonomy. Classification rules match complete terms/phrases to avoid substring collisions such as `car` inside `card`.

The historical SQLite implementation and its synthetic metrics remain in `src/deprecated/server/api/legacy-app.ts` and the ingestion modules for reference. The six-signal interface, context eligibility and ranking strategies are retained. Freshness combines launch recency (180-day decay) with update recency (60-day decay, capped at 75% of the launch component); Recently Launched eligibility still requires an actual publication timestamp inside the 30-day window.

## Context ranking profiles

Multipliers are applied to the user's normalized signal weights, then the resulting weights are normalized again:

| Signal             | Featured | Trending | Recommended | Hidden Gems | Recently Launched |
| ------------------ | -------: | -------: | ----------: | ----------: | ----------------: |
| Affinity           |     1.20 |     1.20 |        1.00 |        1.30 |              1.20 |
| Engagement quality |     1.30 |     1.00 |        1.00 |        1.30 |              1.00 |
| Relevance          |     1.20 |     1.50 |        1.00 |        1.30 |              1.30 |
| Freshness          |     0.80 |     0.80 |        1.00 |        0.80 |              0.70 |
| Popularity         |     0.80 |     0.50 |        1.00 |        0.25 |              0.50 |
| Diversity          |     0.80 |     0.70 |        1.00 |        1.10 |              1.00 |

These are deterministic product heuristics.

## Benchmarking

Run `pnpm benchmark:ranking` to measure all five contexts against the current mock catalog and a deterministic 10,000-record synthetic catalog. The script performs five warm-up runs and reports median/p95 over 35 measured runs. It uses the same pure engine called by Explore.

A local Node 22.16.0 run during this implementation measured:

| Context           | 20-record median | 10,000-record median | 10,000-record p95 |
| ----------------- | ---------------: | -------------------: | ----------------: |
| Featured          |         0.183 ms |            34.257 ms |         53.532 ms |
| Trending          |         0.068 ms |            37.637 ms |         49.256 ms |
| Recommended       |         0.201 ms |            56.361 ms |         78.218 ms |
| Hidden Gems       |         0.142 ms |            12.358 ms |         14.180 ms |
| Recently Launched |         0.074 ms |            23.437 ms |         32.132 ms |

These are engine-only measurements in the implementation container, not browser rendering or production-device measurements. Re-run on the project's Node 26 runtime when evaluating future changes.

The context pipeline uses a bounded top-candidate heap before diversity reranking. The maximum reranking penalty scales with the configured diversity weight (baseline: eight points; capped at twenty points), so it retains the top `8 × resultLimit` candidates plus every candidate within the active penalty budget of that cutoff. A candidate below that bound cannot outrank the retained cutoff candidate even if the latter receives the maximum diversity penalty. At zero diversity weight, the engine skips the extra candidate expansion and greedy reranking entirely. This avoids sorting and pairwise-comparing the entire catalog for small visible result windows while preserving the bounded reranking result.

## API execution model

The active API is a standalone Node HTTP process with no HTTP framework. It makes bounded server-side RoTunnel requests, uses a bounded process-local LRU/TTL cache with in-flight request deduplication, and runs the existing ranking engine in-process. The old worker pool is isolated under `src/deprecated/` and is not imported by the active API.

The historical worker investigation and benchmark trade-offs are documented in [Moving discovery ranking off the HTTP thread](ranking-worker-investigation.md).

## Play-style matching

The discovery API exposes the catalog's 12 play-style profiles through `GET /api/personas`. The Explore filter lets a visitor choose a profile such as Competitive climber, Social explorer or Creative builder. The selected profile is stored in the URL as `persona`, so a discovery view can be shared and refreshed without losing the selection.

Discovery requests pass that profile to the catalog query. Each experience receives a deterministic genre-affinity score computed from the selected profile preferences and the experience genre. Exact preferred genres score highest, adjacent genres receive a middle score, and unrelated genres receive a lower score. A separate persona-relevance score measures whether persona-specific keywords appear in the title, description, subgenre or tags; each keyword contributes at most once, and description length alone cannot increase the score. Genre affinity feeds the affinity signal, while topical keyword alignment feeds relevance. With no persona selected, affinity and relevance are removed from effective weighting and the remaining enabled signals are renormalized; the engine does not invent a default persona score. Leaving the profile set to “All play styles” keeps discovery broad and does not attach a profile match score.

## Play-style evaluation

The archived `scripts/deprecated/evaluate-personas.ts` evaluator historically evaluated the 12 seeded play styles against the local valid catalog and compares each profile's top results with an unpersonalized baseline. It records preferred-genre share and lift, average match score, top-result overlap, unique games across profiles, and eligibility counts for all five contexts. The evaluator writes a Markdown report for review and JSON output for further analysis. It opens SQLite read-only and accepts an injected evaluation clock through `PERSONA_EVALUATION_NOW`.

The evaluation is a behavioral check of the current ranking heuristics. The profile match score is a deterministic genre-affinity input derived from declared genre preferences and genre relationships; the separate persona-relevance input is derived from keyword presence. Neither is learned from player events. A higher preferred-genre share demonstrates that the ranking follows its configured profile preferences, not that users will enjoy those results. Synthetic retention, repeat-play and session metrics remain synthetic ranking inputs and are not Roblox telemetry.
