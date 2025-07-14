import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';

import type { ChangeEventHandler, InputHTMLAttributes, JSX } from 'react';

interface BooleanInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'checked'> {
  readonly ariaLabel?: string;
  readonly checked: boolean;
  readonly className?: string;
  readonly id: string;
  readonly onChange: ChangeEventHandler<HTMLInputElement>;
}

export const BooleanInput = memo<BooleanInputProps>(
  ({ id, checked, onChange, className = '', disabled = false, ariaLabel, ...rest }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);

    const containerClasses = `relative inline-flex cursor-pointer items-center ${className}`;

    const switchClasses = [
      'peer',
      'h-6',
      'w-11',
      'rounded-full',
      `bg-${theme.surfaceTertiary}`,
      'transition-all',
      'after:absolute',
      'after:top-[2px]',
      'after:left-[2px]',
      'after:h-5',
      'after:w-5',
      'after:rounded-full',
      'after:border',
      `after:border-slate-300`,
      'after:bg-white',
      'after:transition-all',
      "after:content-['']",
      'outline-none',
      `peer-focus:ring-2 peer-focus:ring-${theme.ring}`,
      `peer-checked:bg-${theme.accentBg}`,
      'peer-checked:after:translate-x-full',
      'peer-disabled:opacity-50',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <label htmlFor={id} className={containerClasses.trim()}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          className="peer sr-only"
          disabled={disabled}
          onChange={onChange}
          aria-label={ariaLabel}
          {...rest}
        />
        <div className={switchClasses} />
      </label>
    );
  },
);
