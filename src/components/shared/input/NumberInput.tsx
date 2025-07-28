import { memo, useCallback, useEffect, useState } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';
import { ChevronDownIcon, ChevronUpIcon } from '../Icon';

import type { ChangeEvent, JSX, KeyboardEvent } from 'react';

interface NumberInputProps {
  readonly id: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

export const NumberInput = memo<NumberInputProps>(
  ({ id, value, onChange, min, max, step = 1, placeholder, disabled, className = '' }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const [internalValue, setInternalValue] = useState(String(value));

    useEffect(() => {
      const numericInternal = Number(internalValue);
      if (isNaN(numericInternal) || numericInternal !== value) {
        setInternalValue(String(value));
      }
    }, [value, internalValue]);

    const clamp = useCallback(
      (num: number): number => {
        let clamped = num;
        if (min !== undefined) {
          clamped = Math.max(min, clamped);
        }
        if (max !== undefined) {
          clamped = Math.min(max, clamped);
        }
        return clamped;
      },
      [min, max],
    );

    const handleValueChange = useCallback(
      (newValue: number) => {
        onChange(clamp(newValue));
      },
      [clamp, onChange],
    );

    const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
      setInternalValue(event.target.value);
    }, []);

    const handleBlur = useCallback(() => {
      const trimmedValue = internalValue.trim();
      if (trimmedValue === '') {
        setInternalValue(String(value));
        return;
      }
      const numericValue = Number(trimmedValue);
      if (!isNaN(numericValue) && isFinite(numericValue)) {
        handleValueChange(numericValue);
      } else {
        setInternalValue(String(value));
      }
    }, [handleValueChange, value, internalValue]);

    const handleStep = useCallback(
      (direction: 'up' | 'down') => {
        const currentValue = Number(internalValue);
        const numericValue = isNaN(currentValue) ? value : currentValue;
        const change = direction === 'up' ? step : -step;
        handleValueChange(numericValue + change);
      },
      [internalValue, value, step, handleValueChange],
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          handleStep('up');
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          handleStep('down');
        } else if (event.key === 'Enter') {
          handleBlur();
        }
      },
      [handleStep, handleBlur],
    );

    const standardInputStyle = `
      w-full rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceTertiary} p-2
      text-${theme.contentPrimary} placeholder:text-${theme.contentTertiary}
      outline-none focus:ring-2 focus:ring-${theme.ring} disabled:opacity-50
      number-input-no-spinner pr-8
    `;

    const containerClass = `relative flex items-center ${className}`;
    const buttonGroupClass = `
      absolute right-1 top-1 flex h-[calc(100%-8px)] w-6 flex-col
      rounded-r-md border-l border-${theme.borderPrimary}
      bg-${theme.surfaceTertiary}
    `;
    const stepButtonClass = `
      flex h-1/2 w-full flex-shrink-0 items-center justify-center
      text-${theme.contentTertiary} transition-colors
      hover:bg-${theme.surfaceMuted} hover:text-${theme.contentPrimary}
      disabled:cursor-not-allowed disabled:text-${theme.contentDisabled}
    `;

    return (
      <div className={containerClass}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={internalValue}
          placeholder={placeholder}
          disabled={disabled}
          className={standardInputStyle}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        <div className={buttonGroupClass}>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Increment value"
            className={`${stepButtonClass} rounded-tr-sm`}
            disabled={disabled || (max !== undefined && value >= max)}
            onClick={() => handleStep('up')}
          >
            <ChevronUpIcon size={14} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Decrement value"
            className={`${stepButtonClass} rounded-br-sm`}
            disabled={disabled || (min !== undefined && value <= min)}
            onClick={() => handleStep('down')}
          >
            <ChevronDownIcon size={14} />
          </button>
        </div>
      </div>
    );
  },
);
