import { parentPort } from 'node:worker_threads';
import { rankForContext, type RankingConfiguration, type RankingContext } from '@/features/discovery/engine/ranking';
import type { Experience } from '@/types/experience';

if (!parentPort) throw new Error('Ranking worker requires a parent port.');

parentPort.on('message', (message: {
  id: number;
  catalog: Experience[];
  configuration: RankingConfiguration;
  context: RankingContext;
  options: { limit: number; genre?: Experience['genre'] | 'All' };
}) => {
  try {
    const result = rankForContext(message.catalog, message.configuration, message.context, message.options);

    parentPort!.postMessage({ id: message.id, result });
  } catch (error) {
    parentPort!.postMessage({
      id: message.id,
      error: error instanceof Error ? error.message : 'Unknown ranking worker error.',
    });
  }
});
