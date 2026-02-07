import { useCallback, useDeferredValue, useState } from 'react';

import type { ChangeEvent } from 'react';

export interface UseSearchReturn {
  readonly query: string;
  readonly deferredQuery: string;
  readonly onClear: () => void;
  readonly onQueryChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  readonly setQuery: (query: string) => void;
}

export const useSearch = (initialQuery = ''): UseSearchReturn => {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);

  const onQueryChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setQuery(event.target.value);
  }, []);

  const onClear = useCallback(() => {
    setQuery('');
  }, []);

  return { query, deferredQuery, onQueryChange, onClear, setQuery };
};
