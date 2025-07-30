import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';
import { XIcon } from '../Icon';

import type { ChangeEventHandler, InputHTMLAttributes, JSX, MouseEvent, RefObject } from 'react';

interface StringInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'onChange' | 'value' | 'type'> {
  readonly id: string;
  readonly value: string;
  readonly onChange: ChangeEventHandler<HTMLInputElement>;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  readonly onClear?: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly showClearButton?: boolean;
  readonly type?: 'text' | 'search' | 'email' | 'password' | 'tel' | 'url' | 'number';
}

export const StringInput = memo<StringInputProps>(
  ({ id, value, onChange, type = 'text', inputRef, showClearButton, onClear, ...rest }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const { className, disabled, ...trueRest } = rest;

    const hasClearButton = showClearButton && value && !disabled;

    const baseInputStyle = `
      w-full rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceTertiary}
      text-${theme.contentPrimary} placeholder:text-${theme.contentTertiary}
      outline-none focus:ring-2 focus:ring-${theme.ring} disabled:opacity-50
    `;
    const paddingClass = hasClearButton ? 'py-2 pl-2 pr-8' : 'p-2';
    const finalInputClass = `${baseInputStyle} ${paddingClass}`;

    const handleClear = (event: MouseEvent<HTMLButtonElement>): void => {
      onClear?.(event);
      if (document.activeElement !== inputRef?.current) {
        inputRef?.current?.focus();
      }
    };

    const finalWrapperClass = `relative w-full ${className || ''}`.trim();

    return (
      <div className={finalWrapperClass}>
        <input ref={inputRef} id={id} type={type} value={value} className={finalInputClass} onChange={onChange} disabled={disabled} {...trueRest} />
        {hasClearButton && (
          <button
            type="button"
            className={`
              absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full
              text-${theme.contentTertiary} transition-colors hover:bg-${theme.surfaceMuted} hover:text-${theme.contentPrimary}
              focus:ring-2 focus:ring-${theme.ring}
            `}
            aria-label="Clear input"
            onClick={handleClear}
          >
            <XIcon size={16} />
          </button>
        )}
      </div>
    );
  },
);
