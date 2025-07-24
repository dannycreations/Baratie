import { create } from 'zustand';

import { useModalStore } from './useModalStore';

export type SettingTab = 'appearance' | 'extensions';

interface SettingState {
  readonly activeTab: SettingTab;
  readonly openModal: () => void;
  readonly setActiveTab: (tab: SettingTab) => void;
}

export const useSettingStore = create<SettingState>()((set) => ({
  activeTab: 'appearance',

  openModal: () => {
    useModalStore.getState().openModal('settings', undefined);
  },

  setActiveTab: (tab) => {
    set({
      activeTab: tab,
    });
  },
}));
