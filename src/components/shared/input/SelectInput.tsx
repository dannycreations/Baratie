import { memo, useCallback, useMemo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';
import { ChevronDownIcon } from '../Icon';

import type { ChangeEventHandler, JSX, SelectHTMLAttributes } from 'react';
import type { SpiceValue } from '../../../core/IngredientRegistry';

interface SelectInputProps<T extends SpiceValue> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'onChange' | 'value'> {
  readonly id: string;
  readonly options: ReadonlyArray<{
    readonly label: string;
    readonly value: T;
  }>;
  readonly value: T;
  readonly onChange: (value: T) => void;
}

export const SelectInput = memo(
  <T extends SpiceValue>({ id, value, onChange, options, disabled = false, ...rest }: SelectInputProps<T>): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);

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

    const { className, ...trueRest } = rest;
    const finalWrapperClass = `relative ${className || ''}`.trim();
    const selectInputStyle = `w-full appearance-none py-2 pl-2 pr-8 text-${theme.contentPrimary} placeholder:text-${theme.contentTertiary} bg-${theme.surfaceTertiary} rounded-md border border-${theme.borderPrimary} outline-none transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-${theme.ring} disabled:cursor-not-allowed disabled:opacity-50`;

    return (
      <div className={finalWrapperClass}>
        <select id={id} value={String(value)} className={selectInputStyle} disabled={disabled} onChange={handleChange} {...trueRest}>
          {options.map((option) => (
            <option key={String(option.value)} value={String(option.value)} className={`bg-${theme.surfaceSecondary} text-${theme.contentSecondary}`}>
              {option.label}
            </option>
          ))}
        </select>
        <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-${theme.contentTertiary}`}>
          <ChevronDownIcon aria-hidden="true" size={20} />
        </div>
      </div>
    );
  },
);
