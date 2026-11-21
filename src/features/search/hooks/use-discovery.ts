import { useMemo, useState } from 'react';
import { experiences } from '@/data/mocks/experiences';
import { searchExperiences } from '@/features/search/utils/search-experiences';

export function useDiscovery() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchExperiences(query, experiences), [query]);

  return { query, setQuery, results };
}
