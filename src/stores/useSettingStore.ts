import { create } from 'zustand';

export type SettingTab = 'appearance' | 'extensions';

interface SettingState {
  readonly activeTab: SettingTab;
  readonly isModalOpen: boolean;
  readonly closeModal: () => void;
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
