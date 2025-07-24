import { useCallback, useState } from 'react';

import type { DragEvent } from 'react';

interface DragDropProps {
  readonly disabled?: boolean;
  readonly onDragDrop: (file: File) => void;
}

interface DragDropReturn {
  readonly isDragOver: boolean;
  readonly onDragEnter: (event: DragEvent) => void;
  readonly onDragLeave: (event: DragEvent) => void;
  readonly onDragOver: (event: DragEvent) => void;
  readonly onDrop: (event: DragEvent) => void;
}

export function useDragDrop({ onDragDrop, disabled = false }: DragDropProps): DragDropReturn {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = useCallback(
    (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();

      if (disabled) {
        return;
      }

      if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
        if (Array.from(event.dataTransfer.items).some((item: DataTransferItem) => item.kind === 'file')) {
          event.dataTransfer.dropEffect = 'copy';
          setIsDragOver(true);
        }
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();

      if (disabled) {
        event.dataTransfer.dropEffect = 'none';
      } else {
        event.dataTransfer.dropEffect = 'copy';
      }
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      if (disabled) {
        return;
      }

      const file = event.dataTransfer.files?.[0];
      if (file) {
        onDragDrop(file);
      }
    },
    [disabled, onDragDrop],
  );

  return {
    isDragOver,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  };
}
