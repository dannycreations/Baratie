import { memo, useCallback } from 'react';

import { APP_THEMES } from '../../app/themes';
import { useSettingStore } from '../../stores/useSettingStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { CheckIcon } from '../shared/Icon';
import { Modal } from '../shared/Modal';

import type { JSX, KeyboardEvent } from 'react';
import type { AppTheme } from '../../app/themes';
import type { ThemeId } from '../../stores/useThemeStore';

interface PalettePreviewProps {
  readonly theme: AppTheme;
}

const PalettePreview = memo(function PalettePreview({ theme }: PalettePreviewProps) {
  const swatchColors = [
    { class: theme.pageBg, title: 'Page BG' },
    { class: theme.cardBg, title: 'Card BG' },
    { class: theme.accentBg, title: 'Accent' },
    { class: theme.swatchTextBg, title: 'Text' },
    { class: theme.swatchSuccessBg, title: 'Success' },
    { class: theme.swatchErrorBg, title: 'Error' },
  ];

  return (
    <div className="flex items-center space-x-1.5" aria-label="Theme color palette preview">
      {swatchColors.map(({ class: colorClass, title }, i) => (
        <div key={`${title}-${i}`} className={`h-4 w-4 rounded-full border ${theme.inputBorder} ${colorClass}`} title={title} aria-label={title} />
      ))}
    </div>
  );
});

export const SettingPanel = memo(function SettingPanel(): JSX.Element {
  const isPanelOpen = useSettingStore((state) => state.isPanelOpen);
  const closePanel = useSettingStore((state) => state.closePanel);

  const id = useThemeStore((state) => state.id);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const handleSelectTheme = useCallback(
    (id: ThemeId) => {
      setTheme(id);
    },
    [setTheme],
  );

  return (
    <Modal isOpen={isPanelOpen} onClose={closePanel} size="md" title="Settings">
      <div role="radiogroup" aria-labelledby="theme-group-label">
        <h3 id="theme-group-label" className={`text-lg font-medium ${theme.textPrimary}`}>
          Appearance
        </h3>
        <p className={`mt-1 mb-3 text-sm ${theme.textTertiary}`}>Select a color theme for the application.</p>
        <div className={`overflow-hidden rounded-md border ${theme.inputBorder}`}>
          {APP_THEMES.map((item, index) => {
            const isChecked = id === item.id;
            const radioClasses = [
              'flex',
              'cursor-pointer',
              'items-center',
              'justify-between',
              'p-4',
              theme.itemBgHover,
              index > 0 && `border-t ${theme.inputBorder}`,
            ]
              .filter(Boolean)
              .join(' ');
            const nameClasses = ['font-medium', isChecked ? theme.accentText : theme.textSecondary].filter(Boolean).join(' ');

            return (
              <div
                key={item.id}
                role="radio"
                aria-checked={isChecked}
                tabIndex={0}
                className={radioClasses}
                onClick={() => handleSelectTheme(item.id)}
                onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelectTheme(item.id);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <span className={nameClasses}>{item.name}</span>
                  <PalettePreview theme={item.theme} />
                </div>
                {isChecked && <CheckIcon aria-hidden="true" className={theme.accentText} size={20} />}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
});
