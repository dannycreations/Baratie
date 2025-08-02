import { memo, useCallback, useEffect, useState } from 'react';

import { useLongPress } from '../../../hooks/useLongPress';
import { useThemeStore } from '../../../stores/useThemeStore';
import { ChevronDownIcon, ChevronUpIcon } from '../Icon';

import type { ChangeEvent, JSX, KeyboardEvent } from 'react';

interface NumberInputProps {
  readonly id: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly max?: number;
  readonly min?: number;
  readonly onLongPressEnd?: () => void;
  readonly onLongPressStart?: () => void;
  readonly placeholder?: string;
  readonly step?: number;
}

export const NumberInput = memo<NumberInputProps>(
  ({ id, value, onChange, min, max, step = 1, placeholder, disabled, className = '', onLongPressStart, onLongPressEnd }): JSX.Element => {
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
      (newValue: number): void => {
        onChange(clamp(newValue));
      },
      [clamp, onChange],
    );

    const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
      setInternalValue(event.target.value);
    }, []);

    const handleBlur = useCallback((): void => {
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
      (direction: 'up' | 'down'): void => {
        const currentValue = Number(internalValue);
        const numericValue = isNaN(currentValue) ? value : currentValue;
        const change = direction === 'up' ? step : -step;
        handleValueChange(numericValue + change);
      },
      [internalValue, value, step, handleValueChange],
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>): void => {
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

    const handleIncrement = useCallback(() => handleStep('up'), [handleStep]);
    const handleDecrement = useCallback(() => handleStep('down'), [handleStep]);

    const pressHandlersConfig = { onStart: onLongPressStart, onEnd: onLongPressEnd };
    const incrementPressHandlers = useLongPress(handleIncrement, pressHandlersConfig);
    const decrementPressHandlers = useLongPress(handleDecrement, pressHandlersConfig);

    const standardInputStyle = `w-full py-2 pl-2 pr-8 text-${theme.contentPrimary} placeholder:text-${theme.contentTertiary} bg-${theme.surfaceTertiary} rounded-md border border-${theme.borderPrimary} outline-none focus-visible:ring-2 focus-visible:ring-${theme.ring} disabled:opacity-50 number-input-no-spinner`;
    const containerClass = `relative flex items-center ${className}`;
    const buttonGroupClass = `absolute top-1 right-1 flex h-[calc(100%-8px)] w-6 flex-col bg-${theme.surfaceTertiary} rounded-r-md border-l border-${theme.borderPrimary}`;
    const stepButtonClass = `flex h-1/2 w-full shrink-0 items-center justify-center text-${theme.contentTertiary} transition-colors hover:bg-${theme.surfaceMuted} hover:text-${theme.contentPrimary} disabled:cursor-not-allowed disabled:text-${theme.contentDisabled}`;

    return (
      <div className={containerClass}>
        <input
          id={id}
          type="text"
          value={internalValue}
          className={standardInputStyle}
          disabled={disabled}
          inputMode="decimal"
          placeholder={placeholder}
          onBlur={handleBlur}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <div className={buttonGroupClass}>
          <button
            type="button"
            tabIndex={-1}
            className={`${stepButtonClass} rounded-tr-sm`}
            disabled={disabled || (max !== undefined && value >= max)}
            {...incrementPressHandlers}
          >
            <ChevronUpIcon size={14} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            className={`${stepButtonClass} rounded-br-sm`}
            disabled={disabled || (min !== undefined && value <= min)}
            {...decrementPressHandlers}
          >
            <ChevronDownIcon size={14} />
          </button>
        </div>
      </div>
    );
  },
);
