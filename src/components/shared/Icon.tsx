import { clsx } from 'clsx';
import { memo } from 'react';

import { ICON_SIZES } from '../../app/constants';

import type { JSX, ReactNode } from 'react';

export interface IconProps {
  readonly size?: number | string;
  readonly className?: string;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: string | number;
  readonly strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit';
  readonly strokeLinejoin?: 'miter' | 'round' | 'bevel' | 'inherit';
}

export interface StarIconProps extends IconProps {
  readonly isFilled?: boolean;
}

type SvgIconAttributes = Omit<IconProps, 'size' | 'className'>;

export interface CreateIconProps<P extends IconProps = IconProps> {
  readonly iconName: string;
  readonly path: ReactNode;
  readonly defaultProps?: Partial<SvgIconAttributes> | ((props: P) => Partial<SvgIconAttributes>);
}

export const createIcon = <P extends IconProps = IconProps>({ iconName, defaultProps = {}, path }: Readonly<CreateIconProps<P>>) => {
  return memo((props: P): JSX.Element => {
    const { size = ICON_SIZES.LG, className = '', ...rest } = props;
    const { isFilled: _, ...svgProps } = rest as Record<string, unknown>;

    const computedDefaultProps = typeof defaultProps === 'function' ? defaultProps(props) : defaultProps;

    const finalProps = {
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      ...computedDefaultProps,
      ...svgProps,
    };

    return (
      <svg
        width={size}
        height={size}
        className={clsx('flex-shrink-0', `icon-${iconName}`, className)}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        {...finalProps}
      >
        {path}
      </svg>
    );
  });
};

export const AlertTriangleIcon = createIcon({
  iconName: 'alert-triangle',
  path: (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
});

export const CheckIcon = createIcon({
  iconName: 'check',
  path: <polyline points="20 6 9 17 4 12" />,
});

export const ChevronUpIcon = createIcon({
  iconName: 'chevron-up',
  path: <polyline points="18 15 12 9 6 15" />,
});

export const ChevronDownIcon = createIcon({
  iconName: 'chevron-down',
  path: <polyline points="6 9 12 15 18 9" />,
});

export const ChevronRightIcon = createIcon({
  iconName: 'chevron-right',
  path: <polyline points="9 18 15 12 9 6" />,
});

export const CopyIcon = createIcon({
  iconName: 'copy',
  path: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
});

export const DownloadCloudIcon = createIcon({
  iconName: 'download-cloud',
  path: (
    <>
      <polyline points="8 17 12 21 16 17" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.09" />
    </>
  ),
});

export const FileTextIcon = createIcon({
  iconName: 'file-text',
  path: (
    <>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </>
  ),
});

export const FolderOpenIcon = createIcon({
  iconName: 'folder-open',
  path: (
    <path d="m6 14 l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
  ),
});

export const GitMergeIcon = createIcon({
  iconName: 'git-merge',
  path: (
    <>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 9v6a3 3 0 0 0 3 3h6" />
    </>
  ),
});

export const GrabIcon = createIcon({
  iconName: 'grab',
  path: (
    <>
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </>
  ),
  defaultProps: { fill: 'currentColor', stroke: 'none' },
});

export const InfoIcon = createIcon({
  iconName: 'info',
  path: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </>
  ),
});

export const Loader2Icon = createIcon({
  iconName: 'loader-2',
  path: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
});

export const PauseIcon = createIcon({
  iconName: 'pause',
  path: (
    <>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </>
  ),
  defaultProps: { fill: 'currentColor', stroke: 'none' },
});

export const PlayIcon = createIcon({
  iconName: 'play',
  path: <polygon points="5 3 19 12 5 21 5 3" />,
  defaultProps: { fill: 'currentColor', stroke: 'none' },
});

export const PlusIcon = createIcon({
  iconName: 'plus',
  path: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
});

export const PreferencesIcon = createIcon({
  iconName: 'preferences',
  path: (
    <>
      <line x1="21" y1="4" x2="14" y2="4" />
      <line x1="10" y1="4" x2="3" y2="4" />
      <line x1="21" y1="12" x2="12" y2="12" />
      <line x1="8" y1="12" x2="3" y2="12" />
      <line x1="21" y1="20" x2="16" y2="20" />
      <line x1="12" y1="20" x2="3" y2="20" />
      <line x1="14" y1="2" x2="14" y2="6" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="16" y1="18" x2="16" y2="22" />
    </>
  ),
});

export const RefreshCwIcon = createIcon({
  iconName: 'refresh-cw',
  path: (
    <>
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </>
  ),
});

export const SaveIcon = createIcon({
  iconName: 'save',
  path: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </>
  ),
});

export const SettingsIcon = createIcon({
  iconName: 'settings',
  path: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
});

export const StarIcon = createIcon<StarIconProps>({
  iconName: 'star',
  path: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  defaultProps: ({ isFilled = false }: Readonly<StarIconProps>) => ({
    fill: isFilled ? 'currentColor' : 'none',
    strokeWidth: isFilled ? 0 : 2,
  }),
});

export const Trash2Icon = createIcon({
  iconName: 'trash-2',
  path: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </>
  ),
});

export const UploadCloudIcon = createIcon({
  iconName: 'upload-cloud',
  path: (
    <>
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </>
  ),
});

export const XIcon = createIcon({
  iconName: 'x',
  path: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
});
