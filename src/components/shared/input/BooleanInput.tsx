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

export const BooleanInput = memo(function BooleanInput({
  id,
  checked,
  onChange,
  className = '',
  disabled = false,
  ariaLabel,
  ...rest
}: BooleanInputProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);

  const containerClasses = ['relative', 'inline-flex', 'cursor-pointer', 'items-center', className].filter(Boolean).join(' ');
  const peerFocusClasses = ['peer-focus:ring-2', 'peer-focus:ring-offset-2', theme.accentRing, theme.inputBooleanFocusRing].filter(Boolean).join(' ');

  const switchClasses = [
    "peer h-6 w-11 rounded-full after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:content-[''] after:transition-all peer-focus:outline-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
    theme.inputBg,
    theme.inputBooleanHandle,
    theme.accentBgChecked,
    theme.inputCheckedHandle,
    peerFocusClasses,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label htmlFor={id} className={containerClasses}>
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
});
