import { create } from 'zustand';

interface SettingState {
  readonly isPanelOpen: boolean;
  readonly closePanel: () => void;
  readonly openPanel: () => void;
}

export const useSettingStore = create<SettingState>()(function (set) {
  return {
    isPanelOpen: false,
    closePanel() {
      set({ isPanelOpen: false });
    },
    openPanel() {
      set({ isPanelOpen: true });
    },
  };
});
