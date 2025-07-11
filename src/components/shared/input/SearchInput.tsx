import { memo, useCallback } from 'react';

import { StringInput } from './StringInput';

import type { ChangeEvent, JSX } from 'react';

interface SearchInputProps {
  readonly ariaControls?: string;
  readonly ariaLabel: string;
  readonly className?: string;
  readonly id: string;
  readonly placeholder?: string;
  readonly searchTerm: string;
  readonly onSearchChange: (term: string) => void;
}

export const SearchInput = memo(function SearchInput({
  id,
  searchTerm,
  onSearchChange,
  className = '',
  placeholder = 'Search...',
  ariaLabel,
  ...rest
}: SearchInputProps): JSX.Element {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onSearchChange(event.target.value);
    },
    [onSearchChange],
  );

  return (
    <StringInput
      id={id}
      ariaLabel={ariaLabel}
      className={className}
      placeholder={placeholder}
      type="search"
      value={searchTerm}
      onChange={handleChange}
      {...rest}
    />
  );
});
