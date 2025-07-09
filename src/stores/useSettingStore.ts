import { create } from 'zustand';

export type SettingTab = 'appearance' | 'extensions';

interface SettingState {
  readonly activeTab: SettingTab;
  readonly isPanelOpen: boolean;
  readonly setActiveTab: (tab: SettingTab) => void;
  readonly closePanel: () => void;
  readonly openPanel: () => void;
}

export const useSettingStore = create<SettingState>()((set) => ({
  activeTab: 'appearance',
  isPanelOpen: false,

  setActiveTab(tab) {
    set({ activeTab: tab });
  },
  closePanel() {
    set({ isPanelOpen: false });
  },
  openPanel() {
    set({ isPanelOpen: true });
  },
}));