import {
  DEFAULT_RANKING_CONFIGURATION,
  rankForContext,
  retrieveCandidates,
  type RankingConfiguration,
  type RankingContext,
  type RankingOptions,
} from '../../../features/discovery/engine/ranking';
import {
  DISCOVERY_LIMITS,
  isExperienceGenre,
  isRankingConfiguration,
  isRankingContext,
  isRankingStrategy,
} from '../../../config/discovery';
import { seedPersonas } from '../../../domain/personas/personas';
import { applyPersona } from '../../services/experience-enrichment';
import { candidatesForContext } from '../../services/discovery-data';
import type { RoTunnelClient } from '../../providers/rotunnel/index';
import { jsonResponse } from '../http/json-response';
import { awaitWithSignal, throwIfAborted } from '../http/abortable';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null;
}

export async function handlePost(
  client: RoTunnelClient,
  url: URL,
  request: Request,
  signal: AbortSignal = request.signal,
): Promise<Response> {
  const discover = url.pathname.match(/^\/api\/discover\/([a-z-]+)$/);

  if (!discover) return jsonResponse({ error: 'Not found.' }, 404);

  const contextValue = discover[1];

  if (!isRankingContext(contextValue)) {
    return jsonResponse({ error: 'Unknown discovery context.' }, 404);
  }

  const context: RankingContext = contextValue;

  const contentLength = Number(request.headers.get('content-length') ?? 0);

  if (contentLength > DISCOVERY_LIMITS.requestBodyBytes) {
    return jsonResponse({ error: 'Request body exceeds 64 KiB.' }, 413);
  }

  let input: Record<string, unknown>;

  try {
    const raw = await request.text();

    if (new TextEncoder().encode(raw).byteLength > DISCOVERY_LIMITS.requestBodyBytes) {
      return jsonResponse({ error: 'Request body exceeds 64 KiB.' }, 413);
    }

    const parsed: unknown = raw ? JSON.parse(raw) : {};

    if (!isRecord(parsed)) {
      return jsonResponse({ error: 'Request body must be a JSON object.' }, 400);
    }

    input = parsed;
  } catch {
    if (signal.aborted) throw signal.reason;

    return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
  }

  const limit = input.limit === undefined ? 40 : input.limit;

  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > DISCOVERY_LIMITS.resultLimit
  ) {
    return jsonResponse({ error: 'limit must be an integer from 1 to 100.' }, 400);
  }

  if (isPresent(input.genre) && !isExperienceGenre(input.genre)) {
    return jsonResponse({ error: 'Unknown genre.' }, 400);
  }

  const genre = isExperienceGenre(input.genre) ? input.genre : undefined;

  if (
    isPresent(input.persona) &&
    (typeof input.persona !== 'string' || !seedPersonas().some((item) => item.id === input.persona))
  ) {
    return jsonResponse({ error: 'Unknown persona.' }, 400);
  }

  const persona =
    typeof input.persona === 'string'
      ? seedPersonas().find((item) => item.id === input.persona)
      : undefined;

  if (isPresent(input.strategy) && !isRankingStrategy(input.strategy)) {
    return jsonResponse({ error: 'Unknown ranking strategy.' }, 400);
  }

  const strategy = isRankingStrategy(input.strategy)
    ? input.strategy
    : DEFAULT_RANKING_CONFIGURATION.strategy;
  const requestedSignals = input.signals;

  if (isPresent(requestedSignals) && !isRankingConfiguration(requestedSignals)) {
    return jsonResponse({ error: 'Invalid ranking signals.' }, 400);
  }

  const configuration: RankingConfiguration = {
    strategy,
    // Labels and descriptions are canonical server-owned metadata. Only stable
    // signal IDs and user-controlled preferences are accepted from the client.
    signals: isRankingConfiguration(requestedSignals)
      ? DEFAULT_RANKING_CONFIGURATION.signals.map((signal) => {
          const requested = requestedSignals.find((item) => item.id === signal.id);

          return requested
            ? { ...signal, enabled: requested.enabled, weight: requested.weight }
            : signal;
        })
      : DEFAULT_RANKING_CONFIGURATION.signals,
  };

  const candidates = await awaitWithSignal(
    candidatesForContext(client, context, persona?.id),
    signal,
  );

  throwIfAborted(signal);
  const personalized = applyPersona(candidates, persona?.id);
  const options: RankingOptions = {
    limit,
    ...(genre ? { genre } : {}),
  };
  const totalCandidates = retrieveCandidates(personalized, options).length;
  const results = rankForContext(personalized, configuration, context, options);

  return jsonResponse({
    context,
    persona: persona?.id ?? null,
    totalCandidates,
    nativeSortId: personalized[0]?.source?.sortId ?? null,
    results,
  });
}
