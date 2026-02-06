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
  overlay: 'dropzone-overlay',
  placeholder: 'dropzone-placeholder',
};

const DROPZONE_VARIANT_MAP: Readonly<Record<DropZoneVariant, string>> = {
  add: 'dropzone-add',
  remove: 'dropzone-remove',
};

export const DropZoneLayout = memo<DropZoneProps>(({ text, variant = 'add', mode = 'placeholder', className = '' }): JSX.Element => {
  const combinedClass = clsx('dropzone-base', DROPZONE_VARIANT_MAP[variant], DROPZONE_MODE_MAP[mode], className);

  return (
    <div className={combinedClass}>
      <span className="truncate px-2">{text}</span>
    </div>
  );
});
