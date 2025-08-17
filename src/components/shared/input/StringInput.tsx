import { memo, useCallback, useMemo } from 'react';

import { ICON_SIZES } from '../../../app/constants';
import { useThemeStore } from '../../../stores/useThemeStore';
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
    const theme = useThemeStore((state) => state.theme);

    const hasClearButton = showClearButton && value && !disabled;
    const finalWrapperClass = `relative ${className || ''}`.trim();

    const finalInputClass = useMemo(() => {
      const baseInputStyle = `w-full rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceTertiary} text-${theme.contentPrimary} placeholder:text-${theme.contentTertiary} outline-none focus-visible:ring-2 focus-visible:ring-${theme.ring} disabled:opacity-50`;
      const paddingClass = `py-2 pl-2 ${hasClearButton ? 'pr-8' : 'pr-2'}`;
      return `${baseInputStyle} ${paddingClass}`;
    }, [theme, hasClearButton]);

    const handleClear = useCallback((): void => {
      onClear?.();
      inputRef?.current?.focus();
    }, [onClear, inputRef]);

    const clearButtonClass = useMemo(
      () =>
        `absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-${theme.contentTertiary} transition-colors hover:bg-${theme.surfaceMuted} hover:text-${theme.contentPrimary} focus-visible:ring-2 focus-visible:ring-${theme.ring}`,
      [theme],
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
