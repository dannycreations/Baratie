import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';

import type { JSX } from 'react';

type DropzoneMode = 'full' | 'overlay' | 'placeholder';
type DropzoneVariant = 'add' | 'remove';

interface DropzoneProps {
  readonly className?: string;
  readonly mode?: DropzoneMode;
  readonly text: string;
  readonly variant?: DropzoneVariant;
}

const DROPZONE_MODE_MAP: Readonly<Record<DropzoneMode, string>> = {
  full: 'h-full w-full grow p-3',
  overlay: 'pointer-events-none absolute inset-0 z-10 p-4',
  placeholder: 'mt-1.5 h-14 text-sm',
};

export const DropzoneLayout = memo(({ text, variant = 'add', mode = 'placeholder', className = '' }: DropzoneProps): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  const dropzoneThemeMap: Readonly<Record<DropzoneVariant, string>> = {
    add: `border-${theme.infoBorder} bg-${theme.infoBg} text-${theme.infoFg}`,
    remove: `border-${theme.dangerBorder} bg-${theme.dangerBg} text-${theme.dangerFg}`,
  };

  const combinedClasses = [
    'flex items-center justify-center rounded-lg border-2 border-dashed text-center font-semibold transition-all duration-200',
    dropzoneThemeMap[variant],
    DROPZONE_MODE_MAP[mode],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div role="status" className={combinedClasses}>
      {text}
    </div>
  );
});
