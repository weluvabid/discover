import { parentPort } from 'node:worker_threads';
import {
  rankForContext,
  type RankingConfiguration,
  type RankingContext,
} from '@/features/discovery/engine/ranking';
import type { Experience } from '@/types/experience';

const port = parentPort;

if (!port) throw new Error('Ranking worker requires a parent port.');

port.on(
  'message',
  (message: {
    id: number;
    catalog: Experience[];
    configuration: RankingConfiguration;
    context: RankingContext;
    options: { limit: number; genre?: Experience['genre'] | 'All' };
  }) => {
    try {
      const result = rankForContext(
        message.catalog,
        message.configuration,
        message.context,
        message.options,
      );

      port.postMessage({ id: message.id, result });
    } catch (error) {
      port.postMessage({
        id: message.id,
        error: error instanceof Error ? error.message : 'Unknown ranking worker error.',
      });
    }
  },
);
