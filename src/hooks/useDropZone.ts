import { useCallback, useState } from 'react';

import type { DragEvent } from 'react';

export interface DropZoneProps<T> {
  readonly disabled?: boolean;
  readonly effect?: 'copy' | 'move' | 'link';
  readonly onDrop?: (data: T) => void;
  readonly onValidate: (dataTransfer: DataTransfer) => boolean;
  readonly onExtract?: (dataTransfer: DataTransfer) => T;
}

export interface DropZoneReturn<E extends HTMLElement> {
  readonly isDragOver: boolean;
  readonly dropZoneProps: {
    readonly onDragEnter: (event: DragEvent<E>) => void;
    readonly onDragLeave: (event: DragEvent<E>) => void;
    readonly onDragOver: (event: DragEvent<E>) => void;
    readonly onDrop: (event: DragEvent<E>) => void;
  };
  readonly reset: () => void;
}

export function useDropZone<T, E extends HTMLElement>({
  onValidate,
  onDrop,
  onExtract,
  disabled = false,
  effect = 'copy',
}: DropZoneProps<T>): DropZoneReturn<E> {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = useCallback(
    (event: DragEvent<E>): void => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) {
        return;
      }
      if (onValidate(event.dataTransfer)) {
        event.dataTransfer.dropEffect = effect;
        setIsDragOver(true);
      }
    },
    [disabled, onValidate, effect],
  );

  const handleDragLeave = useCallback((event: DragEvent<E>): void => {
    event.preventDefault();
    event.stopPropagation();
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent<E>): void => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled || !onValidate(event.dataTransfer)) {
        event.dataTransfer.dropEffect = 'none';
      } else {
        event.dataTransfer.dropEffect = effect;
      }
    },
    [disabled, onValidate, effect],
  );

  const handleDrop = useCallback(
    (event: DragEvent<E>): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
      if (disabled) {
        return;
      }
      if (onValidate(event.dataTransfer)) {
        if (onDrop && onExtract) {
          const data = onExtract(event.dataTransfer);
          if (data !== undefined) {
            onDrop(data);
          }
        }
      }
    },
    [disabled, onValidate, onDrop, onExtract],
  );

  const reset = useCallback(() => setIsDragOver(false), []);

  return {
    isDragOver,
    dropZoneProps: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
    reset,
  };
}
