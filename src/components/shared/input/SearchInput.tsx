import { memo } from 'react';

import { StringInput } from './StringInput';

import type { JSX, RefObject } from 'react';

interface SearchInputProps {
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onClear: () => void;
  readonly placeholder?: string;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  readonly disabled?: boolean;
}

export const SearchInput = memo<SearchInputProps>(({ id, value, onChange, onClear, placeholder, inputRef, disabled }): JSX.Element => (
  <StringInput
    id={id}
    type="search"
    showClearButton
    value={value}
    placeholder={placeholder}
    onChange={onChange}
    onClear={onClear}
    inputRef={inputRef}
    disabled={disabled}
  />
));
