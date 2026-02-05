import { clsx } from 'clsx';
import { memo } from 'react';

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
    const finalOffBgClass = offBackgroundColor || 'bg-surface-tertiary';

    const containerClass = clsx('relative inline-flex items-center cursor-pointer', className);

    const switchClass = clsx(
      "h-6 w-11 rounded-full outline-none transition-colors after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-disabled:opacity-50",
      finalOffBgClass,
      'after:border-border-secondary',
      'peer-checked:bg-accent-bg',
    );

    return (
      <label className={containerClass}>
        <input id={id} type="checkbox" checked={checked} className="peer absolute h-0 w-0 opacity-0" disabled={disabled} onChange={onChange} />
        <div className={switchClass} />
      </label>
    );
  },
);
