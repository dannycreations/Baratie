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

const DEFAULT_THEME = APP_THEMES[0];

export const useThemeStore = create<ThemeState>()(
  subscribeWithSelector((set) => {
    let id: ThemeId = DEFAULT_THEME.id;
    let theme = DEFAULT_THEME.theme;

    try {
      const themeName = storage.get(STORAGE_THEME, 'Theme');
      const themeConfig = APP_THEMES.find((t) => t.id === themeName);
      if (themeConfig) {
        id = themeConfig.id;
        theme = themeConfig.theme;
      }
    } catch (error) {
      logger.warn('Could not load theme from storage, using default.', error);
    }

    return {
      id,
      theme,
      setTheme(newId) {
        const newTheme = APP_THEMES.find((t) => t.id === newId)?.theme;
        set({ theme: newTheme || DEFAULT_THEME.theme, id: newId });
      },
    };
  }),
);

useThemeStore.subscribe(
  (state) => state.id,
  (themeName) => {
    storage.set(STORAGE_THEME, themeName, 'Theme Preference');
  },
);

useThemeStore.subscribe(
  (state) => state.theme,
  (theme, prevTheme) => {
    const style = document.documentElement.style;
    style.setProperty('--scrollbar-thumb', theme.scrollbarThumb);
    style.setProperty('--scrollbar-thumb-hover', theme.scrollbarThumbHover);

    const themeColorMeta = document.getElementById('theme-color-meta');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme.theme);
    }

    const body = document.body;
    if (prevTheme) {
      body.classList.remove(`bg-${prevTheme.surfacePrimary}`, `text-${prevTheme.contentPrimary}`);
    }
    body.classList.add(`bg-${theme.surfacePrimary}`, `text-${theme.contentPrimary}`);
  },
  { fireImmediately: true },
);
