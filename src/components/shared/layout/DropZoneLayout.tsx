import { clsx } from 'clsx';
import { memo } from 'react';

import { DropZoneMode, DropZoneVariant } from '../../../app/types';

import type { JSX } from 'react';

interface DropZoneProps {
  readonly text: string;
  readonly className?: string;
  readonly mode?: DropZoneMode;
  readonly variant?: DropZoneVariant;
}

const DROPZONE_MODE_MAP: Readonly<Record<DropZoneMode, string>> = {
  overlay: 'pointer-events-none absolute inset-0 z-10 p-3',
  placeholder: 'h-14 text-sm',
};

export const DropZoneLayout = memo<DropZoneProps>(({ text, variant = 'add', mode = 'placeholder', className = '' }): JSX.Element => {
  const dropZoneThemeMap: Readonly<Record<DropZoneVariant, string>> = {
    add: 'border-info-border bg-info-bg text-info-fg',
    remove: 'border-danger-border bg-danger-bg text-danger-fg',
  };

  const combinedClass = clsx(
    'flex items-center justify-center rounded-lg border-2 border-dashed text-center font-semibold transition-colors duration-200',
    dropZoneThemeMap[variant],
    DROPZONE_MODE_MAP[mode],
    className,
  );

  return <div className={combinedClass}>{text}</div>;
});
