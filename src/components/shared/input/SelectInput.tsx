import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';
import { ChevronDownIcon } from '../Icon';

import type { ChangeEventHandler, JSX, SelectHTMLAttributes } from 'react';

interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly id: string;
  readonly options: readonly { readonly label: string; readonly value: string | number | boolean }[];
  readonly value: string;
  readonly onChange: ChangeEventHandler<HTMLSelectElement>;
}

export const SelectInput = memo(
  ({ id, value, onChange, options, className = '', disabled = false, ariaLabel, ...rest }: SelectInputProps): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
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
        <select id={id} value={value} className={finalClasses} disabled={disabled} onChange={onChange} aria-label={ariaLabel} {...rest}>
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
