import { experiences } from '@/data/mocks/experiences';
import { searchExperiences as searchCatalog } from '@/features/search/utils/search-experiences';

export { useDiscovery } from '@/features/search/hooks/use-discovery';

export function searchExperiences(query: string, items = experiences) {
  return searchCatalog(query, items);
}
