import { cn } from 'cnfast';
import { memo } from 'react';

import type { JSX } from 'react';

interface BooleanInputProps {
  readonly id: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly className?: string;
  readonly offBackgroundColor?: string;
  readonly disabled?: boolean;
}

export const BooleanInput = memo<BooleanInputProps>(
  ({ id, checked, onChange, className = '', disabled = false, offBackgroundColor }): JSX.Element => {
    const containerClass = cn('input-boolean-container', className);

    const switchClass = cn('input-boolean-switch', !checked && offBackgroundColor);

    return (
      <label className={containerClass}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          className="peer absolute h-0 w-0 opacity-0"
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <div className={switchClass} />
      </label>
    );
  },
);
