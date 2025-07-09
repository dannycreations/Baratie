import { create } from 'zustand';

interface DragMoveState {
  readonly draggedItemId: string | null;
  readonly setDraggedItemId: (id: string | null) => void;
}

export const useDragMoveStore = create<DragMoveState>()((set) => ({
  draggedItemId: null,

  setDraggedItemId(id: string | null): void {
    set({ draggedItemId: id });
  },
}));