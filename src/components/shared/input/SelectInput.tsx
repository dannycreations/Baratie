import { memo, useCallback, useMemo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';
import { cn } from '../../../utilities/styleUtil';
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

    const finalWrapperClass = cn('relative', className);
    const selectInputStyle = cn(
      'w-full appearance-none py-2 pl-2 pr-8 rounded-md border outline-none transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
      `text-${theme.contentPrimary}`,
      `placeholder:text-${theme.contentTertiary}`,
      `bg-${theme.surfaceTertiary}`,
      `border-${theme.borderPrimary}`,
    );

    return (
      <div className={finalWrapperClass}>
        <select id={id} value={String(value)} className={selectInputStyle} disabled={disabled} onChange={handleChange}>
          {options.map((option) => (
            <option
              key={String(option.value)}
              value={String(option.value)}
              className={cn(`bg-${theme.surfaceSecondary}`, `text-${theme.contentSecondary}`)}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className={cn('pointer-events-none absolute inset-y-0 right-0 flex items-center px-2', `text-${theme.contentTertiary}`)}>
          <ChevronDownIcon size={20} />
        </div>
      </div>
    );
  },
);
