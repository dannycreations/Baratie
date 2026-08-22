import { useCallback, useEffect, useRef } from 'react';

import { errorHandler } from '../app/container';
import { useDragMoveStore } from '../stores/useDragMoveStore';

import type { DragEvent } from 'react';

interface DragMoveHookProps<T extends { id: string }> {
  readonly items: ReadonlyArray<T>;
  readonly onDragMove: (draggedId: string, targetItemId: string) => void;
}

interface DragMoveHookReturn {
  readonly onDragEnd: () => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>, targetItemId: string) => void;
  readonly onDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void;
}

export const useDragMove = <T extends { id: string }>({ items, onDragMove }: DragMoveHookProps<T>): DragMoveHookReturn => {
  const itemIndexMapRef = useRef(new Map<string, number>());

  useEffect(() => {
    const indexMap = new Map<string, number>();
    items.forEach((item, index) => {
      indexMap.set(item.id, index);
    });
    itemIndexMapRef.current = indexMap;
  }, [items]);

  const handleDragStart = useCallback((event: DragEvent<HTMLElement>, itemId: string): void => {
    useDragMoveStore.getState().setDraggedItemId(itemId);
    event.dataTransfer.effectAllowed = 'move';

    errorHandler.attempt(
      () => {
        event.dataTransfer.setData('text/plain', itemId);
      },
      'Drag Operation Setup',
      {
        genericMessage: 'Failed to properly initialize item drag operation.',
        shouldNotify: false,
      },
    );
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>, targetItemId: string): void => {
      event.preventDefault();

      const draggedId = useDragMoveStore.getState().draggedItemId;
      if (!draggedId || draggedId === targetItemId) {
        return;
      }

      event.dataTransfer.dropEffect = 'move';

      const itemIndexMap = itemIndexMapRef.current;
      const draggedIndex = itemIndexMap.get(draggedId);
      const targetIndex = itemIndexMap.get(targetItemId);

      if (draggedIndex === undefined || targetIndex === undefined) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const threshold = rect.height * 0.25;

      if (draggedIndex < targetIndex && event.clientY < rect.top + threshold) {
        return;
      }

      if (draggedIndex > targetIndex && event.clientY > rect.bottom - threshold) {
        return;
      }

      onDragMove(draggedId, targetItemId);
    },
    [onDragMove],
  );

  const handleDragEnd = useCallback((): void => {
    useDragMoveStore.getState().setDraggedItemId(null);
  }, []);

  return {
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
  };
};
