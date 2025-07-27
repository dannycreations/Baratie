import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';

import type { JSX } from 'react';

type DropZoneMode = 'full' | 'overlay' | 'placeholder';
type DropZoneVariant = 'add' | 'remove';

interface DropZoneProps {
  readonly className?: string;
  readonly mode?: DropZoneMode;
  readonly text: string;
  readonly variant?: DropZoneVariant;
}

const DROPZONE_MODE_MAP: Readonly<Record<DropZoneMode, string>> = {
  full: 'h-full w-full grow p-3',
  overlay: 'pointer-events-none absolute inset-0 z-10 p-4',
  placeholder: 'mt-1.5 h-14 text-sm',
};

export const DropZoneLayout = memo<DropZoneProps>(({ text, variant = 'add', mode = 'placeholder', className = '' }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  const dropZoneThemeMap: Readonly<Record<DropZoneVariant, string>> = {
    add: `border-${theme.infoBorder} bg-${theme.infoBg} text-${theme.infoFg}`,
    remove: `border-${theme.dangerBorder} bg-${theme.dangerBg} text-${theme.dangerFg}`,
  };

  const combinedClass = `
    flex items-center justify-center rounded-lg border-2
    border-dashed text-center font-semibold transition-all duration-200
    ${dropZoneThemeMap[variant]} ${DROPZONE_MODE_MAP[mode]} ${className}
  `.trim();

  return (
    <div role="status" className={combinedClass}>
      {text}
    </div>
  );
});
