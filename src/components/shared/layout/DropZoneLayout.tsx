import { cn } from 'cnfast';
import { memo } from 'react';

import type { JSX } from 'react';

export type DropZoneMode = 'overlay' | 'placeholder';
export type DropZoneVariant = 'add' | 'remove';

interface DropZoneProps {
  readonly text: string;
  readonly className?: string;
  readonly mode?: DropZoneMode;
  readonly variant?: DropZoneVariant;
}

export const DropZoneLayout = memo<DropZoneProps>(({ text, variant = 'add', mode = 'placeholder', className = '' }): JSX.Element => {
  const combinedClass = cn('dropzone-base', `dropzone-${variant}`, `dropzone-${mode}`, className);

  return (
    <div className={combinedClass}>
      <span className="truncate px-2">{text}</span>
    </div>
  );
});
