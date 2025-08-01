import { memo, useCallback } from 'react';

import { APP_THEMES } from '../../app/themes';
import { useThemeStore } from '../../stores/useThemeStore';
import { CheckIcon } from '../shared/Icon';
import { ItemListLayout } from '../shared/layout/ListLayout';

import type { JSX } from 'react';
import type { AppTheme } from '../../app/themes';
import type { ThemeId } from '../../stores/useThemeStore';

interface PalettePreviewProps {
  readonly theme: AppTheme;
}

const PalettePreview = memo<PalettePreviewProps>(({ theme }): JSX.Element => {
  const swatchColors = [
    { color: theme.surfacePrimary, title: 'Page BG' },
    { color: theme.surfaceSecondary, title: 'Card BG' },
    { color: theme.accentBg, title: 'Accent' },
    { color: theme.contentPrimary, title: 'Text' },
    { color: theme.successFg, title: 'Success' },
    { color: theme.dangerFg, title: 'Error' },
  ];

  return (
    <div className="flex items-center space-x-1">
      {swatchColors.map(({ color, title }, index) => (
        <div key={`${title}-${index}`} className={`h-4 w-4 rounded-full border border-${theme.borderPrimary} bg-${color}`} title={title} />
      ))}
    </div>
  );
});

export const AppearanceTab = memo((): JSX.Element => {
  const id = useThemeStore((state) => state.id);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const handleSelectTheme = useCallback(
    (themeId: ThemeId): void => {
      setTheme(themeId);
    },
    [setTheme],
  );

  return (
    <div className="flex h-full flex-col">
      <p id="theme-group-label" className={`mb-3 text-sm text-${theme.contentTertiary}`}>
        Select a color theme for the application.
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {APP_THEMES.map((item) => {
          const isChecked = id === item.id;
          const liClass = `list-none rounded-md cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-${theme.ring}`;
          const itemLayoutClass = `h-16 p-2 border-2 rounded-md transition-colors duration-150 ${isChecked ? `border-${theme.infoBorder} bg-${theme.surfaceMuted}` : `border-${theme.borderPrimary} bg-${theme.surfaceSecondary} hover:border-${theme.borderSecondary} hover:bg-${theme.surfaceMuted}`}`;

          const leftContent = (
            <div className="flex flex-col justify-center gap-1">
              <span className={`font-medium text-sm ${isChecked ? `text-${theme.infoFg}` : `text-${theme.contentPrimary}`}`}>{item.name}</span>
              <PalettePreview theme={item.theme} />
            </div>
          );

          const rightContent = isChecked ? (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
              <CheckIcon className={`text-${theme.infoFg}`} size={16} />
            </div>
          ) : null;

          return (
            <li
              key={item.id}
              className={liClass}
              onClick={() => {
                handleSelectTheme(item.id);
              }}
            >
              <ItemListLayout
                className={itemLayoutClass}
                leftContent={leftContent}
                rightClasses="flex shrink-0 items-center"
                rightContent={rightContent}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
});
