import { memo, useCallback } from 'react';

import { StringInput } from './StringInput';

import type { ChangeEvent, JSX } from 'react';

interface SearchInputProps {
  readonly className?: string;
  readonly id: string;
  readonly placeholder?: string;
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
}

export const SearchInput = memo<SearchInputProps>(({ id, query, onQueryChange, className = '', placeholder = 'Search...', ...rest }): JSX.Element => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onQueryChange(event.target.value);
    },
    [onQueryChange],
  );

  return <StringInput id={id} className={className} placeholder={placeholder} type="search" value={query} onChange={handleChange} {...rest} />;
});
