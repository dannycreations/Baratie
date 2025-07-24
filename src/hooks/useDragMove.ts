import { useCallback, useEffect } from 'react';

import { errorHandler } from '../app/container';
import { useDragMoveStore } from '../stores/useDragMoveStore';

import type { DragEvent } from 'react';

interface DragMoveProps {
  readonly onDragMove: (draggedId: string, targetItemId: string) => void;
}

interface DragMoveReturn {
  readonly dragId: string | null;
  readonly onDragEnd: (event: DragEvent<HTMLElement>) => void;
  readonly onDragEnter: (event: DragEvent<HTMLElement>, targetItemId: string) => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>) => void;
  readonly onDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void;
}

export function useDragMove({ onDragMove }: DragMoveProps): DragMoveReturn {
  const dragId = useDragMoveStore((state) => state.draggedItemId);
  const setDraggedItemId = useDragMoveStore((state) => state.setDraggedItemId);

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
      setDraggedItemId(itemId);
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

      if (event.currentTarget) {
        event.currentTarget.setAttribute('aria-grabbed', 'true');
      }
    },
    [setDraggedItemId],
  );

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLElement>, targetItemId: string): void => {
      event.preventDefault();
      if (dragId && dragId !== targetItemId) {
        onDragMove(dragId, targetItemId);
      }
    },
    [dragId, onDragMove],
  );

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>): void => {
      event.preventDefault();

      if (dragId) {
        event.dataTransfer.dropEffect = 'move';
        if (event.currentTarget) {
          event.currentTarget.setAttribute('aria-dropeffect', 'move');
        }
      }
    },
    [dragId],
  );

  const handleDragEnd = useCallback(
    (event: DragEvent<HTMLElement>): void => {
      if (event.currentTarget) {
        event.currentTarget.setAttribute('aria-grabbed', 'false');
      }
      setDraggedItemId(null);
    },
    [setDraggedItemId],
  );

  return {
    dragId,
    onDragStart: handleDragStart,
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
  };
}
