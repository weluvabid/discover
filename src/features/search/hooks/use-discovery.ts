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
    const controller = new AbortController();
    let active = true;

    Promise.resolve()
      .then(() => {
        if (!active) return;

        if (!normalized) {
          setResults([]);
          setError(null);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);
        return searchCatalog(normalized, 'All', 'relevance', controller.signal)
          .then((nextResults) => {
            if (active) setResults(nextResults);
          })
          .catch((cause: unknown) => {
            if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;
            setError(cause instanceof Error ? cause.message : 'Search failed.');
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      })
      .catch((cause: unknown) => {
        if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;
        setError(cause instanceof Error ? cause.message : 'Search failed.');
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [query]);

  return { query, setQuery, results, loading, error };
}
