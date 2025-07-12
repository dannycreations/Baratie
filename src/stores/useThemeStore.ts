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

const DEFAULT_DARK_THEME = APP_THEMES.find((t) => t.id === 'dark')!;

export const useThemeStore = create<ThemeState>()(
  subscribeWithSelector((set) => {
    let id = DEFAULT_DARK_THEME.id;
    let theme = DEFAULT_DARK_THEME.theme;

    try {
      const stored = localStorage.getItem(STORAGE_THEME);
      if (stored) {
        const potentialThemeName = JSON.parse(stored);
        const themeConfig = APP_THEMES.find((theme) => theme.id === potentialThemeName);
        if (themeConfig) {
          id = themeConfig.id;
          theme = themeConfig.theme;
        }
      }
    } catch (error) {
      logger.warn('Could not load theme from storage, using default.', error);
    }

    return {
      id,
      theme,
      setTheme(id: ThemeId) {
        const newTheme = APP_THEMES.find((theme) => theme.id === id)?.theme;
        set({ theme: newTheme || DEFAULT_DARK_THEME.theme, id });
      },
    };
  }),
);

useThemeStore.subscribe(
  (state) => state.theme,
  (theme) => {
    const style = document.documentElement.style;
    style.setProperty('--scrollbar-thumb', theme.scrollbarThumb);
    style.setProperty('--scrollbar-thumb-hover', theme.scrollbarThumbHover);

    const themeColorMeta = document.getElementById('theme-color-meta');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme.themeColor);
    }
  },
  { fireImmediately: true },
);

useThemeStore.subscribe(
  (state) => state.id,
  (themeName) => {
    storage.set(STORAGE_THEME, themeName, 'Theme Preference');
  },
);
