import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_THEME } from '../app/constants';
import { logger, storage } from '../app/container';
import { APP_THEMES } from '../app/themes';

import type { AppTheme } from '../app/themes';

export type ThemeId = (typeof APP_THEMES)[number]['id'];

interface ThemeState {
  readonly id: ThemeId;
  readonly theme: AppTheme;
  readonly setTheme: (id: ThemeId) => void;
}

const darkThemeConfig = APP_THEMES.find((t) => t.id === 'dark')!;

function selectThemeName(state: ThemeState): ThemeId {
  return state.id;
}

function saveThemeNameToStorage(themeName: ThemeId): void {
  storage.set(STORAGE_THEME, themeName, 'Theme Preference');
}

export const useThemeStore = create<ThemeState>()(
  subscribeWithSelector(function (set) {
    let id = darkThemeConfig.id;
    let theme = darkThemeConfig.theme;

    try {
      const stored = localStorage.getItem(STORAGE_THEME);
      if (stored) {
        const potentialThemeName = JSON.parse(stored);
        const themeConfig = APP_THEMES.find((t) => t.id === potentialThemeName);
        if (themeConfig) {
          id = themeConfig.id;
          theme = themeConfig.theme;
        }
      }
    } catch (e) {
      logger.warn('Could not load theme from storage, using default.');
    }

    return {
      id,
      theme,
      setTheme(id: ThemeId) {
        const newTheme = APP_THEMES.find((t) => t.id === id)?.theme;
        set({ theme: newTheme || darkThemeConfig.theme, id });
      },
    };
  }),
);

useThemeStore.subscribe(selectThemeName, saveThemeNameToStorage);
