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

export const SelectInput = memo(function SelectInput({
  id,
  value,
  onChange,
  options,
  className = '',
  disabled = false,
  ariaLabel,
  ...rest
}: SelectInputProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);
  const selectInputStyle = [
    'w-full',
    'rounded-md',
    'border',
    'p-2',
    'outline-none',
    'appearance-none',
    'pr-8',
    'transition-colors',
    'duration-150',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    theme.inputText,
    theme.textPlaceholder,
    theme.inputBg,
    theme.inputBgHover,
    theme.inputBorder,
    theme.inputFocusRing,
  ]
    .filter(Boolean)
    .join(' ');

  const finalClasses = [selectInputStyle, className].filter(Boolean).join(' ');

  return (
    <div className="relative w-full">
      <select id={id} value={value} className={finalClasses} disabled={disabled} onChange={onChange} aria-label={ariaLabel} {...rest}>
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)} className={`${theme.cardBg} ${theme.textSecondary}`}>
            {option.label}
          </option>
        ))}
      </select>
      <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 ${theme.textTertiary}`}>
        <ChevronDownIcon aria-hidden="true" size={20} />
      </div>
    </div>
  );
});
