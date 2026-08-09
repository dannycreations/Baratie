import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_SETTINGS } from '../app/constants';
import { persistStore } from '../utilities/storeUtil';

interface SettingProps {
  readonly multipleOpen: boolean;
  readonly persistRecipe: boolean;
}

interface SettingState extends SettingProps {
  readonly setMultipleOpen: (value: boolean) => void;
  readonly setPersistRecipe: (value: boolean) => void;
}

export const useSettingStore = create<SettingState>()(
  subscribeWithSelector((set) => ({
    multipleOpen: false,
    persistRecipe: true,

    setMultipleOpen: (multipleOpen) => {
      set({ multipleOpen });
    },

    setPersistRecipe: (persistRecipe) => {
      set({ persistRecipe });
    },
  })),
);

persistStore(useSettingStore, {
  key: STORAGE_SETTINGS,
  context: 'App Settings',
  autoHydrate: true,
  pick: (state) => ({
    multipleOpen: state.multipleOpen,
    persistRecipe: state.persistRecipe,
  }),
});
