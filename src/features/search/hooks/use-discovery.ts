import { useEffect, useState } from 'react';
import type { Experience } from '@/types/experience';
import { searchCatalog } from '@/lib/api/discover-api';

export function useDiscovery() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalized = query.trim();

    if (!normalized) {
      setResults([]);
      setError(null);
      setLoading(false);

      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);
    searchCatalog(normalized, 'All', controller.signal)
      .then(setResults)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;

        setError(cause instanceof Error ? cause.message : 'Search failed.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query]);

  return { query, setQuery, results, loading, error };
}
