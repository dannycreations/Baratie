import { clsx } from 'clsx';
import { memo, useCallback, useMemo } from 'react';

import { ChevronDownIcon } from '../Icon';

import type { ChangeEventHandler, JSX } from 'react';
import type { SpiceValue } from '../../../core/IngredientRegistry';

interface SelectInputProps<T extends SpiceValue> {
  readonly id: string;
  readonly options: ReadonlyArray<{
    readonly label: string;
    readonly value: T;
  }>;
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export const SelectInput = memo(
  <T extends SpiceValue>({ id, value, onChange, options, disabled = false, className }: SelectInputProps<T>): JSX.Element => {
    const valueToOptionMap = useMemo(() => {
      return new Map(options.map((opt) => [String(opt.value), opt]));
    }, [options]);

    const handleChange = useCallback<ChangeEventHandler<HTMLSelectElement>>(
      (event) => {
        const stringValue = event.target.value;
        const selectedOption = valueToOptionMap.get(stringValue);
        if (selectedOption) {
          onChange(selectedOption.value);
        }
      },
      [valueToOptionMap, onChange],
    );

    const finalWrapperClass = clsx('relative', className);
    const selectInputStyle = clsx('input-base', 'input-base-padding', 'appearance-none pr-8 cursor-pointer');

    return (
      <div className={finalWrapperClass}>
        <select id={id} value={String(value)} className={selectInputStyle} disabled={disabled} onChange={handleChange}>
          {options.map((option) => (
            <option key={String(option.value)} value={String(option.value)} className="bg-surface-secondary text-content-secondary">
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-content-tertiary">
          <ChevronDownIcon size={20} />
        </div>
      </div>
    );
  },
);
