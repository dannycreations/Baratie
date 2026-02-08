import { memo } from 'react';

import { StringInput } from './StringInput';

import type { ChangeEvent, JSX, RefObject } from 'react';

interface SearchInputProps {
  readonly id: string;
  readonly value: string;
  readonly onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  readonly onClear: () => void;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  readonly placeholder?: string;
  readonly disabled?: boolean;
}

export const SearchInput = memo<SearchInputProps>(({ id, value, onChange, onClear, inputRef, placeholder = 'Search...', disabled }): JSX.Element => {
  return (
    <StringInput
      id={id}
      type="search"
      inputRef={inputRef}
      value={value}
      placeholder={placeholder}
      showClearButton
      disabled={disabled}
      onChange={onChange}
      onClear={onClear}
    />
  );
});
