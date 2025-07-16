import { memo, useCallback } from 'react';

import { APP_THEMES } from '../../app/themes';
import { useThemeStore } from '../../stores/useThemeStore';
import { CheckIcon } from '../shared/Icon';
import { ItemListLayout } from '../shared/layout/ItemListLayout';

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
    <div className="flex items-center space-x-1.5" aria-label="Theme color palette preview">
      {swatchColors.map(({ color, title }, index) => (
        <div
          key={`${title}-${index}`}
          className={`h-4 w-4 rounded-full border border-${theme.borderPrimary} bg-${color}`}
          title={title}
          aria-label={title}
        />
      ))}
    </div>
  );
});

export const AppearanceTab = memo((): JSX.Element => {
  const id = useThemeStore((state) => state.id);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const handleSelectTheme = useCallback(
    (themeId: ThemeId) => {
      const themeToSet = APP_THEMES.find((theme) => theme.id === themeId);
      if (themeToSet) {
        setTheme(themeToSet.id);
      }
    },
    [setTheme],
  );

  return (
    <div role="radiogroup" aria-labelledby="theme-group-label">
      <p id="theme-group-label" className={`mb-3 text-sm text-${theme.contentTertiary}`}>
        Select a color theme for the application.
      </p>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {APP_THEMES.map((item) => {
          const isChecked = id === item.id;
          const leftContent = (
            <div className="flex flex-col justify-center gap-1">
              <span className={`font-medium text-sm ${isChecked ? `text-${theme.infoFg}` : `text-${theme.contentPrimary}`}`}>{item.name}</span>
              <PalettePreview theme={item.theme} />
            </div>
          );

          const rightContent = isChecked ? (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
              <CheckIcon aria-hidden="true" className={`text-${theme.infoFg}`} size={16} />
            </div>
          ) : null;

          const itemLayoutClasses = `h-16 rounded-md p-3 border-2 transition-all duration-150 ${
            isChecked
              ? `border-${theme.infoBorder} bg-${theme.surfaceMuted}`
              : `border-${theme.borderPrimary} bg-${theme.surfaceSecondary} hover:bg-${theme.surfaceMuted} hover:border-${theme.borderSecondary}`
          }`;

          const liClasses = `list-none cursor-pointer rounded-md outline-none focus:ring-2 focus:ring-${theme.ring}`;

          return (
            <li
              key={item.id}
              role="radio"
              aria-checked={isChecked}
              tabIndex={0}
              className={liClasses}
              onClick={() => handleSelectTheme(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectTheme(item.id);
                }
              }}
            >
              <ItemListLayout
                className={itemLayoutClasses}
                leftContent={leftContent}
                leftClass="grow min-w-0"
                rightContent={rightContent}
                rightClass="flex shrink-0 items-center"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
});
