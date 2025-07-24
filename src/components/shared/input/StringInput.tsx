import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';

import type { ChangeEventHandler, InputHTMLAttributes, JSX, RefObject } from 'react';

interface StringInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'onChange' | 'value' | 'type'> {
  readonly id: string;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  readonly type?: 'text' | 'search' | 'email' | 'password' | 'tel' | 'url' | 'number';
  readonly value: string;
  readonly onChange: ChangeEventHandler<HTMLInputElement>;
}

export const StringInput = memo<StringInputProps>(({ id, value, onChange, type = 'text', inputRef, ...rest }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const { className, ...trueRest } = rest;
  const standardInputStyle = `
    w-full rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceTertiary} p-2
    text-${theme.contentPrimary} placeholder:text-${theme.contentTertiary}
    outline-none focus:ring-2 focus:ring-${theme.ring} disabled:opacity-50
  `;
  const finalClass = `${standardInputStyle} ${className || ''}`.trim();

  return <input ref={inputRef} id={id} type={type} value={value} className={finalClass} onChange={onChange} {...trueRest} />;
});
