# Discover ranking architecture

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

The 30-day window and mock thresholds are explicit policy values, not learned model parameters.

## Signals

The shared model retains six normalized signals: affinity, engagement quality, relevance, freshness, popularity, and diversity. User-selected weights are normalized to 100 across enabled signals. Each context applies a multiplier profile to those weights and renormalizes the effective weights before scoring.

The weighted score is:

`weightedScore = sum(normalizedSignal * effectiveWeight)`

The second-stage reranker uses genre and tag Jaccard similarity to apply a bounded ordering penalty. The raw penalty and the applied score adjustment are exposed separately. If a score is already at zero, the score adjustment is floored at zero while the raw penalty still explains the ordering decision, so arithmetically:

`finalScore = weightedScore + appliedDiversityAdjustment`

Signal contributions reconcile to `weightedScore`; the final score reconciles after the explicit reranking adjustment.

## Explainability

Every ranked item carries its context, final score, weighted score, diversity adjustment, raw and normalized signal values, effective weights, weighted contributions, eligibility evidence, and top contributing reasons. The UI renders this evidence in a portal-backed popover so it does not change card or row layout and is not clipped by card overflow.

## Time and determinism

Ranking accepts an injected `Date`. The Explore page captures one clock value for its ranking snapshot so all five contexts use the same temporal boundary. Invalid publication dates do not qualify for Recently Launched. Future-dated experiences are excluded from that context. Stable ID tie-breaking makes equal-score results deterministic.

## Current data boundary

The browser requests discovery results from the Hono API. The API ranks the valid local SQLite catalog, populated from a pinned Roblox discovery CSV and enriched through public Roblox metadata endpoints. `matchScore` is a deterministic synthetic persona-affinity input, not a value learned from real player events. For enriched records, the existing quality signal also consumes synthetic D1/D7/D30 retention, repeat-play rate and average session duration; mock records without those fields retain the original rating/playtime calculation. The six-signal interface, context eligibility and ranking strategies remain shared between both data sources.

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

The context pipeline uses a bounded top-candidate heap before diversity reranking. The reranker can subtract at most eight points, so it retains the top `8 × resultLimit` candidates plus every candidate within eight points of that cutoff. A candidate below that bound cannot outrank the retained cutoff candidate even if the latter receives the maximum diversity penalty. This avoids sorting and pairwise-comparing the entire catalog for small visible result windows while preserving the bounded reranking result.


## API execution model

The API runs ranking in a four-thread Node.js worker pool by default. Candidate retrieval remains on the HTTP thread and uses the local SQLite read model. Set `RANKING_WORKERS=0` to use synchronous ranking, or override the worker count for benchmarking. The worker queue is bounded by `RANKING_QUEUE_CAPACITY` (default `128`); when capacity is exhausted, discovery returns HTTP 503.

I moved ranking to workers after API measurements showed that synchronous CPU work was blocking the HTTP event loop. The benchmark, trade-offs, and reasoning behind the four-worker default are documented in [Moving discovery ranking off the HTTP thread](ranking-worker-investigation.md).

## Play-style matching

The discovery API exposes the catalog's 12 play-style profiles through `GET /api/personas`. The Explore filter lets a visitor choose a profile such as Competitive climber, Social explorer or Creative builder. The selected profile is stored in the URL as `persona`, so a discovery view can be shared and refreshed without losing the selection.

Discovery requests pass that profile to the catalog query. Each experience receives its corresponding catalog match score, which feeds the affinity and relevance signals and is shown as a profile-match indicator on result cards. Leaving the profile set to “All play styles” keeps discovery broad and does not attach a profile match score.
