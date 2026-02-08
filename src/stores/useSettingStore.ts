import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_RECIPE, STORAGE_SETTINGS } from '../app/constants';
import { storage } from '../app/container';
import { persistStore } from '../utilities/storeUtil';

interface SettingProps {
  readonly multipleOpen: boolean;
  readonly persistRecipe: boolean;
}

interface SettingState extends SettingProps {
  readonly init: () => void;
  readonly setMultipleOpen: (value: boolean) => void;
  readonly setPersistRecipe: (value: boolean) => void;
}

export const useSettingStore = create<SettingState>()(
  subscribeWithSelector((set) => ({
    multipleOpen: false,
    persistRecipe: true,

    init: () => {},

    setMultipleOpen: (multipleOpen) => {
      set({ multipleOpen });
    },

    setPersistRecipe: (persistRecipe) => {
      if (!persistRecipe) {
        storage.remove(STORAGE_RECIPE, 'Current Recipe');
      }
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
