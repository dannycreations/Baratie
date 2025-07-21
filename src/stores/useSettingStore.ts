import { create } from 'zustand';

export type SettingTab = 'appearance' | 'extensions';

interface SettingState {
  readonly activeTab: SettingTab;
  readonly closeModal: () => void;
  readonly isModalOpen: boolean;
  readonly openModal: () => void;
  readonly setActiveTab: (tab: SettingTab) => void;
}

export const useSettingStore = create<SettingState>()((set) => ({
  activeTab: 'appearance',
  isModalOpen: false,

  closeModal: () => {
    set({ isModalOpen: false });
  },

  openModal: () => {
    set({ isModalOpen: true });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },
}));
