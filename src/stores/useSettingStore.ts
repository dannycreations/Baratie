import { create } from 'zustand';

export type SettingTab = 'appearance' | 'extensions';

interface SettingState {
  readonly activeTab: SettingTab;
  readonly isModalOpen: boolean;
  readonly isModalPause: boolean;
  readonly closeModal: () => void;
  readonly openModal: () => void;
  readonly pauseModal: () => void;
  readonly resumeModal: () => void;
  readonly setActiveTab: (tab: SettingTab) => void;
}

export const useSettingStore = create<SettingState>()((set, get) => ({
  activeTab: 'appearance',
  isModalOpen: false,
  isModalPause: false,
  closeModal: () => {
    set({ isModalOpen: false, isModalPause: false });
  },
  openModal: () => {
    set({ isModalOpen: true, isModalPause: false });
  },
  pauseModal: () => {
    if (get().isModalOpen) {
      set({ isModalOpen: false, isModalPause: true });
    }
  },
  resumeModal: () => {
    if (get().isModalPause) {
      set({ isModalOpen: true, isModalPause: false });
    }
  },
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },
}));
