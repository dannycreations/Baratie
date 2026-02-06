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
    const containerClass = clsx('input-boolean-container', className);

    const switchClass = clsx('input-boolean-switch', !checked && offBackgroundColor);

    return (
      <label className={containerClass}>
        <input id={id} type="checkbox" checked={checked} className="peer absolute h-0 w-0 opacity-0" disabled={disabled} onChange={onChange} />
        <div className={switchClass} />
      </label>
    );
  },
);
