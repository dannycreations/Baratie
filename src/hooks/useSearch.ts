import { useCallback, useDeferredValue, useState } from 'react';

interface UseSearchReturn {
  readonly query: string;
  readonly deferredQuery: string;
  readonly onClear: () => void;
  readonly onQueryChange: (value: string) => void;
}

export const useSearch = (): UseSearchReturn => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const onQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const onClear = useCallback(() => {
    setQuery('');
  }, []);

  return { query, deferredQuery, onQueryChange, onClear };
};
