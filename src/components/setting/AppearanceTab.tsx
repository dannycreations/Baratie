import { clsx } from 'clsx';
import { memo, useCallback } from 'react';

import { ICON_SIZES, THEME_VARIANT } from '../../app/constants';
import { useThemeStore } from '../../stores/useThemeStore';
import { CheckIcon } from '../shared/Icon';

import type { JSX } from 'react';
import type { ThemeId } from '../../stores/useThemeStore';

interface PalettePreviewProps {
  readonly themeId: string;
}

const PalettePreview = memo<PalettePreviewProps>(({ themeId }): JSX.Element => {
  return (
    <div className={clsx('flex items-center space-x-1', themeId)}>
      <div className="h-4 w-4 rounded-full border border-border-primary bg-[var(--surface-primary)]" title="Page BG" />
      <div className="h-4 w-4 rounded-full border border-border-primary bg-[var(--surface-secondary)]" title="Card BG" />
      <div className="h-4 w-4 rounded-full border border-border-primary bg-[var(--accent-bg)]" title="Accent" />
      <div className="h-4 w-4 rounded-full border border-border-primary bg-[var(--content-primary)]" title="Text" />
      <div className="h-4 w-4 rounded-full border border-border-primary bg-[var(--success-fg)]" title="Success" />
      <div className="h-4 w-4 rounded-full border border-border-primary bg-[var(--danger-fg)]" title="Error" />
    </div>
  );
});

interface ThemeItemProps {
  readonly item: (typeof THEME_VARIANT)[number];
  readonly isChecked: boolean;
  readonly onSelect: (id: ThemeId) => void;
}

const ThemeItem = memo<ThemeItemProps>(({ item, isChecked, onSelect }): JSX.Element => {
  const handleClick = useCallback(() => {
    onSelect(item.id);
  }, [onSelect, item.id]);

  const liClass = clsx('list-none rounded-md cursor-pointer outline-none');

  const itemLayoutClass = clsx(
    'list-item-container flex h-16 w-full items-center justify-between border-2 p-2',
    isChecked ? 'border-info-border bg-surface-muted' : 'border-border-primary hover:border-border-secondary hover:bg-surface-muted',
  );

  const leftContent = (
    <div className="flex flex-col justify-center gap-1">
      <h3 className={clsx('list-item-title font-medium', isChecked ? 'text-info-fg' : 'text-content-primary')}>{item.name}</h3>
      <PalettePreview themeId={item.id} />
    </div>
  );

  const rightContent = isChecked ? (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
      <CheckIcon className="text-info-fg" size={ICON_SIZES.XS} />
    </div>
  ) : null;

  return (
    <li className={liClass} onClick={handleClick}>
      <div className={itemLayoutClass}>
        <div className="flex-1-min-0">{leftContent}</div>
        <div className="list-item-actions">{rightContent}</div>
      </div>
    </li>
  );
});

export const AppearanceTab = memo((): JSX.Element => {
  const id = useThemeStore((state) => state.id);
  const setTheme = useThemeStore((state) => state.setTheme);

  const handleSelectTheme = useCallback(
    (themeId: ThemeId): void => {
      setTheme(themeId);
    },
    [setTheme],
  );

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {THEME_VARIANT.map((item) => (
        <ThemeItem key={item.id} item={item} isChecked={id === item.id} onSelect={handleSelectTheme} />
      ))}
    </ul>
  );
});
