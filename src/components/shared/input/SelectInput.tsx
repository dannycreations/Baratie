import { memo, useCallback } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';
import { ChevronDownIcon } from '../Icon';

import type { ChangeEventHandler, JSX, SelectHTMLAttributes } from 'react';
import type { SpiceValue } from '../../../core/IngredientRegistry';

interface SelectInputProps<T extends SpiceValue> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly id: string;
  readonly options: readonly { readonly label: string; readonly value: T }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

export const SelectInput = memo(
  <T extends SpiceValue>({
    id,
    value,
    onChange,
    options,
    className = '',
    disabled = false,
    ariaLabel,
    ...rest
  }: SelectInputProps<T>): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);

    const handleChange = useCallback<ChangeEventHandler<HTMLSelectElement>>(
      (event) => {
        const stringValue = event.target.value;
        const selectedOption = options.find((opt) => String(opt.value) === stringValue);
        if (selectedOption) {
          onChange(selectedOption.value);
        }
      },
      [options, onChange],
    );

    const selectInputStyle = [
      'w-full',
      'appearance-none',
      'rounded-md',
      'border',
      `border-${theme.borderPrimary}`,
      `bg-${theme.surfaceTertiary}`,
      'py-2',
      'pl-2',
      'pr-8',
      `text-${theme.contentPrimary}`,
      'transition-colors',
      'duration-150',
      `placeholder:text-${theme.contentTertiary}`,
      `hover:bg-${theme.surfaceHover}`,
      'outline-none',
      `focus:ring-2 focus:ring-${theme.ring}`,
      'disabled:opacity-50',
    ]
      .filter(Boolean)
      .join(' ');

    const finalClasses = [selectInputStyle, className].filter(Boolean).join(' ');

    return (
      <div className="relative w-full">
        <select id={id} value={String(value)} className={finalClasses} disabled={disabled} onChange={handleChange} aria-label={ariaLabel} {...rest}>
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
