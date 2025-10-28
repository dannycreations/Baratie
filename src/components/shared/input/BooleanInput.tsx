import { memo, useMemo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';
import { cn } from '../../../utilities/styleUtil';

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

    const containerClass = cn('relative inline-flex items-center cursor-pointer', className);

    const switchClass = useMemo(
      () =>
        cn(
          "h-6 w-11 rounded-full outline-none transition-colors after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all after:content-[''] peer-focus-visible:ring-2 peer-checked:after:translate-x-full peer-disabled:opacity-50",
          `bg-${finalOffBgColor}`,
          `after:border-${theme.borderSecondary}`,
          `peer-focus-visible:ring-${theme.ring}`,
          `peer-checked:bg-${theme.accentBg}`,
        ),
      [finalOffBgColor, theme],
    );

    return (
      <label className={containerClass}>
        <input id={id} type="checkbox" checked={checked} className="peer absolute h-0 w-0 opacity-0" disabled={disabled} onChange={onChange} />
        <div className={switchClass} />
      </label>
    );
  },
);
