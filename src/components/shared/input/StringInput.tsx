import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';

import type { ChangeEventHandler, InputHTMLAttributes, JSX, RefObject } from 'react';

interface StringInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly id: string;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  readonly placeholder?: string;
  readonly type?: 'text' | 'search' | 'email' | 'password' | 'tel' | 'url' | 'number';
  readonly value: string;
  readonly onChange: ChangeEventHandler<HTMLInputElement>;
}

export const StringInput = memo(function StringInput({
  id,
  value,
  onChange,
  type = 'text',
  placeholder,
  className = '',
  inputRef,
  disabled = false,
  ariaLabel,
  ...rest
}: StringInputProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);
  const standardInputStyle = [
    'w-full',
    'rounded-md',
    'border',
    'p-2',
    'outline-none',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    theme.inputText,
    theme.textPlaceholder,
    theme.inputBg,
    theme.inputBorder,
    theme.inputFocusNoBorder,
    theme.inputFocusRing,
  ]
    .filter(Boolean)
    .join(' ');

  const finalClasses = [standardInputStyle, className].filter(Boolean).join(' ');

  return (
    <input
      id={id}
      ref={inputRef}
      type={type}
      value={value}
      className={finalClasses}
      disabled={disabled}
      placeholder={placeholder}
      onChange={onChange}
      aria-label={ariaLabel}
      {...rest}
    />
  );
});
