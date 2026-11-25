# Moving discovery ranking off the HTTP thread

## Why I changed it

I started with a synchronous API because it was the simplest way to connect the catalog to the ranking engine. A discovery request loaded its candidate catalog from SQLite, ran the ranking pipeline, and returned the ranked experiences. That kept the execution path easy to follow and gave me a useful baseline before adding concurrency.

The first API benchmarks showed a clear problem. With one request at a time, recommended discovery took roughly 25–27 ms. As concurrent requests increased, throughput stayed close to 38 requests per second while latency grew almost linearly. At 100 concurrent requests, the median response time was about 2.62 seconds. The event-loop delay also climbed sharply: a 38.07 ms mean, 126.48 ms p95, and a 2.4 second maximum.

The stage measurements helped explain the result. Catalog retrieval was consistently around 9 ms, while ranking took around 16 ms. Ranking was synchronous CPU work running on the same thread that handled HTTP requests. While that work was running, the event loop could not make progress on other requests.

I moved the ranking computation into Node.js worker threads. The API still retrieves candidates from SQLite and validates the request on the main thread; it sends the catalog and ranking configuration to a worker, then returns the ranked result when the worker finishes. Keeping the database read on the main thread made this a focused experiment: I could measure the effect of moving CPU-heavy ranking without changing the storage architecture at the same time.

## What I measured

I ran the production API build against the same local SQLite catalog, which contained 1,027 eligible experiences. Each configuration used 200 measured samples and 30 warm-up requests. I tested synchronous ranking and worker pools with 2, 4, and 8 workers, using concurrency levels from 1 through 100.

### Throughput under concurrent recommended discovery

| Concurrent requests | Synchronous |  2 workers |  4 workers |  8 workers |
| ------------------: | ----------: | ---------: | ---------: | ---------: |
|                   1 |  36.1 req/s | 34.8 req/s | 36.4 req/s | 35.9 req/s |
|                   5 |  37.6 req/s | 56.2 req/s | 68.1 req/s | 67.7 req/s |
|                  10 |  37.2 req/s | 57.2 req/s | 70.1 req/s | 76.5 req/s |
|                  25 |  37.5 req/s | 55.8 req/s | 71.1 req/s | 80.3 req/s |
|                  50 |  37.3 req/s | 57.3 req/s | 74.2 req/s | 81.7 req/s |
|                 100 |  37.6 req/s | 59.1 req/s | 77.1 req/s | 83.8 req/s |

At 100 concurrent requests, the eight-worker run reached 83.8 requests per second, compared with 37.6 for the synchronous baseline. The four-worker run reached 77.1 requests per second. The improvement came from allowing ranking work for different requests to execute in parallel instead of serializing all ranking on the HTTP thread.

### Event-loop delay

| Configuration |     Mean |       p95 |     Maximum |
| ------------- | -------: | --------: | ----------: |
| Synchronous   | 38.07 ms | 126.48 ms | 2,403.34 ms |
| 2 workers     | 15.00 ms |  18.74 ms |   935.85 ms |
| 4 workers     | 15.07 ms |  17.17 ms |   822.08 ms |
| 8 workers     | 15.66 ms |  17.71 ms |   819.99 ms |

The event loop became substantially more responsive after ranking moved to workers. The mean and p95 delay fell sharply. The maximum delay also fell, although occasional long pauses remained during these benchmark runs.

### What the worker pool showed

At 100 concurrent requests, average queue wait and worker execution time were:

| Workers | Average queue wait | Average worker execution |
| ------: | -----------------: | -----------------------: |
|       2 |          108.47 ms |                 21.39 ms |
|       4 |           65.81 ms |                 26.06 ms |
|       8 |           43.52 ms |                 34.02 ms |

Adding workers reduced time waiting for an available worker. Worker execution time increased as the pool grew, which is consistent with more CPU contention. The eight-worker pool completed more requests, but each worker took longer on average to execute its ranking task.

### Memory cost

| Configuration | RSS after run |
| ------------- | ------------: |
| Synchronous   |     254.9 MiB |
| 2 workers     |     639.4 MiB |
| 4 workers     |     684.8 MiB |
| 8 workers     |     911.8 MiB |

Worker threads improved throughput, but they also increased memory use. The jump from four to eight workers added about 227 MiB of RSS for a smaller throughput gain than the move from the synchronous implementation to four workers.

## The decision

I set the API default to four ranking workers. In the 100-concurrent-request run, four workers delivered 77.1 requests per second, just over twice the synchronous baseline. Eight workers reached 83.8 requests per second, but used considerably more memory and showed longer average worker execution time. Four workers gave me a better balance between throughput and resource use for this project.

SQLite catalog retrieval remains on the main thread. Its measured p50 stayed close to 9 ms across all four configurations, so these runs did not give me a reason to redesign database access. I am keeping the storage path simple rather than adding another concurrency layer without evidence that it would improve the application.

The worker pool has a bounded queue, reports capacity exhaustion as HTTP 503, rejects work assigned to a failed worker, replaces failed workers, and shuts down with the API process. `RANKING_WORKERS` can override the default, and setting it to `0` restores synchronous ranking for comparison. `RANKING_QUEUE_CAPACITY` controls the number of waiting ranking jobs.

## Historical benchmark reproduction

This investigation measured the former SQLite-backed API and worker-pool implementation. The benchmark scripts and worker pool are now retained under `scripts/deprecated/` and `src/deprecated/`; the commands below document the original run configuration and are not current package scripts. They are included to preserve how the reported measurements were produced.

```bash
# Synchronous baseline
BENCHMARK_SAMPLES=200 \
BENCHMARK_WARMUPS=30 \
BENCHMARK_CONCURRENCY=1,5,10,25,50,100 \
pnpm benchmark:api

# Worker configurations
BENCHMARK_SAMPLES=200 BENCHMARK_WARMUPS=30 BENCHMARK_CONCURRENCY=1,5,10,25,50,100 RANKING_WORKERS=2 pnpm benchmark:api:workers
BENCHMARK_SAMPLES=200 BENCHMARK_WARMUPS=30 BENCHMARK_CONCURRENCY=1,5,10,25,50,100 RANKING_WORKERS=4 pnpm benchmark:api:workers
BENCHMARK_SAMPLES=200 BENCHMARK_WARMUPS=30 BENCHMARK_CONCURRENCY=1,5,10,25,50,100 RANKING_WORKERS=8 pnpm benchmark:api:workers
```

The measurements above came from a local run using Node.js v22.22.0 on the development machine, against the 1,027-record eligible catalog. They describe that historical benchmark environment and workload; they do not describe the active RoTunnel API, which now runs ranking in-process.

## What I took from the experiment

The useful result was not simply a higher requests-per-second number. The benchmark showed me where the time was going, connected the event-loop delay to synchronous ranking, and gave me a way to compare the throughput gain with its memory cost. I changed the execution model where the measurements pointed, kept the database architecture intact, and stopped when the next increase in worker count offered a much smaller return.

For Discover, that is enough performance work for this stage. I want the next engineering effort to improve the recommendation experience itself: the quality of the results, the usefulness of their explanations, and how quickly someone can find a game worth playing.
