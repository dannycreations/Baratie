import { clsx } from 'clsx';
import { memo, useCallback } from 'react';

import { ICON_SIZES } from '../../../app/constants';
import { XIcon } from '../Icon';

import type { ChangeEventHandler, JSX, KeyboardEvent, RefObject } from 'react';

interface StringInputProps {
  readonly id: string;
  readonly value: string;
  readonly onChange: ChangeEventHandler<HTMLInputElement>;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  readonly onClear?: () => void;
  readonly showClearButton?: boolean;
  readonly type?: 'text' | 'search' | 'email' | 'password' | 'tel' | 'url' | 'number';
  readonly className?: string;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export const StringInput = memo<StringInputProps>(
  ({ id, value, onChange, type = 'text', inputRef, showClearButton, onClear, className, disabled, placeholder, onKeyDown }): JSX.Element => {
    const hasClearButton = showClearButton && value && !disabled;
    const finalWrapperClass = clsx('relative', className);

    const finalInputClass = clsx('input-base input-base-padding', hasClearButton ? 'pr-8' : 'pr-2');

    const handleClear = useCallback((): void => {
      onClear?.();
      inputRef?.current?.focus();
    }, [onClear, inputRef]);

    const clearButtonClass = clsx(
      'absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors',
      'text-content-tertiary hover:bg-surface-muted hover:text-content-primary',
    );

    return (
      <div className={finalWrapperClass}>
        <input
          ref={inputRef}
          id={id}
          type={type}
          value={value}
          className={finalInputClass}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          onKeyDown={onKeyDown}
        />
        {hasClearButton && (
          <button type="button" className={clearButtonClass} onClick={handleClear}>
            <XIcon size={ICON_SIZES.XS} />
          </button>
        )}
      </div>
    );
  },
);
