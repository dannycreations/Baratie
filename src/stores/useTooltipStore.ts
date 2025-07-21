import { create } from 'zustand';

interface TooltipState {
  readonly activeId: string | null;
  readonly setActiveId: (id: string | null) => void;
}

export const useTooltipStore = create<TooltipState>()((set) => ({
  activeId: null,
  setActiveId: (id) => {
    set({ activeId: id });
  },
}));
