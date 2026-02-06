import { clsx } from 'clsx';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { ICON_SIZES } from '../../../app/constants';
import { useLongPress } from '../../../hooks/useLongPress';
import { clamp } from '../../../utilities/objectUtil';
import { ChevronDownIcon, ChevronUpIcon } from '../Icon';

import type { ChangeEvent, JSX, KeyboardEvent, WheelEvent } from 'react';

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
    const valueRef = useRef(value);
    const [internalValue, setInternalValue] = useState(String(value));

    useEffect(() => {
      if (valueRef.current !== value) {
        setInternalValue(String(value));
      } else {
        if (internalValue !== '' && internalValue !== '-' && value !== parseFloat(internalValue)) {
          setInternalValue(String(value));
        }
      }
      valueRef.current = value;
    }, [value, internalValue]);

    const handleInputChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>): void => {
        const val = event.target.value;
        if (val === '' || val === '-' || /^-?\d*\.?\d*$/.test(val)) {
          setInternalValue(val);

          const numericValue = parseFloat(val);
          if (isFinite(numericValue)) {
            const clampedValue = clamp(numericValue, min, max);
            if (clampedValue !== value) {
              onChange(clampedValue);
            }
          }
        }
      },
      [min, max, onChange, value],
    );

    const handleBlur = useCallback((): void => {
      const numericValue = parseFloat(internalValue);
      if (isFinite(numericValue)) {
        const clampedValue = clamp(numericValue, min, max);
        setInternalValue(String(clampedValue));
        if (clampedValue !== value) {
          onChange(clampedValue);
        }
      } else {
        setInternalValue(String(value));
      }
    }, [internalValue, min, max, onChange, value]);

    const handleStep = useCallback(
      (direction: 'up' | 'down'): void => {
        const currentValue = parseFloat(internalValue);
        const numericValue = isFinite(currentValue) ? currentValue : value;
        const change = direction === 'up' ? step : -step;
        const finalValue = clamp(numericValue + change, min, max);

        setInternalValue(String(finalValue));
        if (finalValue !== value) {
          onChange(finalValue);
        }
      },
      [internalValue, value, step, min, max, onChange],
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
          (event.target as HTMLInputElement).blur();
        }
      },
      [handleStep],
    );

    const handleWheel = useCallback(
      (event: WheelEvent<HTMLInputElement>) => {
        if (document.activeElement === event.currentTarget) {
          event.preventDefault();
          handleStep(event.deltaY < 0 ? 'up' : 'down');
        }
      },
      [handleStep],
    );

    const handleIncrement = useCallback(() => handleStep('up'), [handleStep]);
    const handleDecrement = useCallback(() => handleStep('down'), [handleStep]);

    const pressHandlersConfig = { onStart: onLongPressStart, onEnd: onLongPressEnd };
    const incrementPressHandlers = useLongPress(handleIncrement, pressHandlersConfig);
    const decrementPressHandlers = useLongPress(handleDecrement, pressHandlersConfig);

    const standardInputStyle = clsx('input-base input-base-padding pr-8 number-input-no-spinner');
    const containerClass = clsx('input-number-container', className);
    const buttonGroupClass = clsx('input-number-button-group');
    const stepButtonClass = clsx('input-number-button');

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
          onWheel={handleWheel}
        />
        <div className={buttonGroupClass}>
          <button
            type="button"
            className={clsx(stepButtonClass, 'rounded-tr-sm')}
            disabled={disabled || (max !== undefined && value >= max)}
            {...incrementPressHandlers}
          >
            <ChevronUpIcon size={ICON_SIZES.XXS} />
          </button>
          <button
            type="button"
            className={clsx(stepButtonClass, 'rounded-br-sm')}
            disabled={disabled || (min !== undefined && value <= min)}
            {...decrementPressHandlers}
          >
            <ChevronDownIcon size={ICON_SIZES.XXS} />
          </button>
        </div>
      </div>
    );
  },
);
