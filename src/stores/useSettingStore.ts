import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_SETTINGS } from '../app/constants';
import { storage } from '../app/container';

interface AppSettings {
  readonly allowMultipleOpen: boolean;
}

interface SettingState extends AppSettings {
  readonly init: () => void;
  readonly setAllowMultipleOpen: (value: boolean) => void;
}

export const useSettingStore = create<SettingState>()(
  subscribeWithSelector((set) => ({
    allowMultipleOpen: false,

    init: () => {
      const settings = storage.get<AppSettings>(STORAGE_SETTINGS, 'App Settings');
      if (settings) {
        set({
          allowMultipleOpen: settings.allowMultipleOpen ?? false,
        });
      }
    },

    setAllowMultipleOpen: (value) => {
      set({ allowMultipleOpen: value });
    },
  })),
);

useSettingStore.subscribe(
  (state) => ({ allowMultipleOpen: state.allowMultipleOpen }),
  (settings) => {
    storage.set(STORAGE_SETTINGS, settings, 'App Settings');
  },
);
