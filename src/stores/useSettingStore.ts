import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_RECIPE, STORAGE_SETTINGS } from '../app/constants';
import { storage } from '../app/container';
import { shallowEqual } from '../utilities/objectUtil';

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

    init: () => {
      const settings = storage.get<SettingProps>(STORAGE_SETTINGS, 'App Settings');
      if (settings) {
        set({
          multipleOpen: settings.multipleOpen ?? false,
          persistRecipe: settings.persistRecipe ?? true,
        });
      }
    },

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

useSettingStore.subscribe(
  (state) => ({ multipleOpen: state.multipleOpen, persistRecipe: state.persistRecipe }),
  ({ multipleOpen, persistRecipe }) => {
    const newSettings = { multipleOpen, persistRecipe };
    storage.set(STORAGE_SETTINGS, newSettings, 'App Settings');
  },
  {
    equalityFn: shallowEqual,
  },
);
