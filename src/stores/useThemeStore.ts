import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_THEME, THEME_VARIANT } from '../app/constants';
import { storage } from '../app/container';
import { persistStore } from '../utilities/storeUtil';

export type ThemeId = (typeof THEME_VARIANT)[number]['id'];

interface ThemeState {
  readonly id: ThemeId;
  readonly setTheme: (id: ThemeId) => void;
}

const DEFAULT_THEME_ID = THEME_VARIANT[0].id;

const getInitialThemeId = (): ThemeId => {
  const storedThemeId = storage.get<ThemeId>(STORAGE_THEME, 'Theme');
  const themeConfig = THEME_VARIANT.find((theme) => theme.id === storedThemeId);
  return themeConfig ? themeConfig.id : DEFAULT_THEME_ID;
};

export const useThemeStore = create<ThemeState>()(
  subscribeWithSelector((set) => {
    const id = getInitialThemeId();

    return {
      id,

      setTheme: (newId) => {
        set({ id: newId });
      },
    };
  }),
);

persistStore(useThemeStore, {
  key: STORAGE_THEME,
  context: 'Theme Preference',
  pick: (state) => ({ id: state.id }),
  onHydrate: (state) => {
    const themeConfig = THEME_VARIANT.find((t) => t.id === state.id);
    if (themeConfig) {
      const themeColorMeta = document.getElementById('theme-color-meta');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', themeConfig.color);
      }
    }
  },
});
