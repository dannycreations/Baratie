import { memo, useCallback, useRef } from 'react';

import type { ChangeEvent, JSX, ReactNode } from 'react';

export interface FilePickerRenderProps {
  readonly trigger: () => void;
}

interface FilePickerProps {
  readonly children: (props: FilePickerRenderProps) => ReactNode;
  readonly onFileSelect: (file: File) => void;
  readonly accept?: string;
  readonly inputId?: string;
}

export const FilePicker = memo<FilePickerProps>(({ children, onFileSelect, accept, inputId }): JSX.Element => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const file = event.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
      if (event.target) {
        event.target.value = '';
      }
    },
    [onFileSelect],
  );

  const trigger = useCallback((): void => {
    inputRef.current?.click();
  }, []);

  return (
    <>
      {children({ trigger })}
      <input ref={inputRef} id={inputId} type="file" className="hidden" accept={accept} onChange={handleFileChange} />
    </>
  );
});
