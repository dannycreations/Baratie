import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';

import type { ChangeEvent, InputHTMLAttributes, JSX } from 'react';

interface BooleanInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'checked' | 'id' | 'className'> {
  readonly id: string;
  readonly checked: boolean;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly className?: string;
}

export const BooleanInput = memo<BooleanInputProps>(({ id, checked, onChange, className = '', disabled = false, ...rest }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  const containerClass = `relative inline-flex items-center cursor-pointer ${className}`.trim();
  const switchClass = `
    peer h-6 w-11 rounded-full bg-${theme.surfaceTertiary} outline-none transition-all
    after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5
    after:rounded-full after:border after:border-slate-300 after:bg-white
    after:transition-all after:content-[''] peer-focus:ring-2
    peer-focus:ring-${theme.ring} peer-checked:bg-${theme.accentBg}
    peer-checked:after:translate-x-full peer-disabled:opacity-50
  `;

  return (
    <label className={containerClass}>
      <input id={id} type="checkbox" role="switch" checked={checked} className="peer sr-only" disabled={disabled} onChange={onChange} {...rest} />
      <div className={switchClass} />
    </label>
  );
});
