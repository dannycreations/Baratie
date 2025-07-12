import { create } from 'zustand';

export type SettingTab = 'appearance' | 'extensions';

interface SettingState {
  readonly activeTab: SettingTab;
  readonly isModalOpen: boolean;
  readonly setActiveTab: (tab: SettingTab) => void;
  readonly closeModal: () => void;
  readonly openModal: () => void;
}

export const useSettingStore = create<SettingState>()((set) => ({
  activeTab: 'appearance',
  isModalOpen: false,

  setActiveTab(tab) {
    set({ activeTab: tab });
  },

  closeModal() {
    set({ isModalOpen: false });
  },

  openModal() {
    set({ isModalOpen: true });
  },
}));
