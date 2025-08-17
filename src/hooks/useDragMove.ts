import { useCallback, useEffect, useRef } from 'react';

import { errorHandler } from '../app/container';

import type { DragEvent } from 'react';

export interface DragMoveHookProps<T extends { id: string }> {
  readonly dragId: string | null;
  readonly items: ReadonlyArray<T>;
  readonly onDragMove: (draggedId: string, targetItemId: string) => void;
  readonly setDragId: (id: string | null) => void;
}

export interface DragMoveHookReturn {
  readonly onDragEnd: (event: DragEvent<HTMLElement>) => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>, targetItemId: string) => void;
  readonly onDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void;
}

export function useDragMove<T extends { id: string }>({ dragId, setDragId, onDragMove, items }: DragMoveHookProps<T>): DragMoveHookReturn {
  const itemIndexMapRef = useRef(new Map<string, number>());

  useEffect(() => {
    const newMap = new Map<string, number>();
    items.forEach((item, index) => {
      newMap.set(item.id, index);
    });
    itemIndexMapRef.current = newMap;
  }, [items]);

  useEffect(() => {
    if (dragId) {
      document.body.classList.add('grabbing');
    } else {
      document.body.classList.remove('grabbing');
    }

    return () => {
      document.body.classList.remove('grabbing');
    };
  }, [dragId]);

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>, itemId: string): void => {
      setDragId(itemId);
      event.dataTransfer.effectAllowed = 'move';

      errorHandler.attempt(
        () => {
          event.dataTransfer.setData('text/plain', itemId);
        },
        'Drag Operation Setup',
        {
          genericMessage: 'Failed to properly initialize item drag operation.',
          shouldLog: true,
          shouldNotify: false,
        },
      );
    },
    [setDragId],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>, targetItemId: string): void => {
      event.preventDefault();

      if (!dragId) {
        return;
      }

      event.dataTransfer.dropEffect = 'move';

      if (dragId === targetItemId) {
        return;
      }

      const itemIndexMap = itemIndexMapRef.current;
      const draggedIndex = itemIndexMap.get(dragId);
      const targetIndex = itemIndexMap.get(targetItemId);

      if (draggedIndex === undefined || targetIndex === undefined) {
        return;
      }

      const targetElement = event.currentTarget as HTMLElement;
      const rect = targetElement.getBoundingClientRect();
      const threshold = rect.height * 0.25;

      // Dragging downwards: only trigger reorder when cursor is in the bottom 75%
      if (draggedIndex < targetIndex && event.clientY < rect.top + threshold) {
        return;
      }

      // Dragging upwards: only trigger reorder when cursor is in the top 75%
      if (draggedIndex > targetIndex && event.clientY > rect.bottom - threshold) {
        return;
      }

      onDragMove(dragId, targetItemId);
    },
    [dragId, onDragMove],
  );

  const handleDragEnd = useCallback((): void => {
    setDragId(null);
  }, [setDragId]);

  return {
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
  };
}
