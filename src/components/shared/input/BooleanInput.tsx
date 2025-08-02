import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';

import type { ChangeEvent, JSX } from 'react';

interface BooleanInputProps {
  readonly id: string;
  readonly checked: boolean;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly className?: string;
  readonly offBackgroundColor?: string;
  readonly disabled?: boolean;
}

export const BooleanInput = memo<BooleanInputProps>(
  ({ id, checked, onChange, className = '', disabled = false, offBackgroundColor }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);

    const finalOffBgColor = offBackgroundColor || theme.surfaceTertiary;

    const containerClass = `relative inline-flex items-center cursor-pointer ${className}`.trim();
    const switchClass = `peer h-6 w-11 rounded-full bg-${finalOffBgColor} outline-none transition-colors after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-${theme.borderSecondary} after:bg-white after:transition-all after:content-[''] peer-focus-visible:ring-2 peer-focus-visible:ring-${theme.ring} peer-checked:bg-${theme.accentBg} peer-checked:after:translate-x-full peer-disabled:opacity-50`;

    return (
      <label className={containerClass}>
        <input id={id} type="checkbox" checked={checked} className="peer sr-only" disabled={disabled} onChange={onChange} />
        <div className={switchClass} />
      </label>
    );
  },
);
