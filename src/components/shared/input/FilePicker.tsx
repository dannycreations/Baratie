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
    (event: ChangeEvent<HTMLInputElement>) => {
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

  const trigger = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <>
      {children({ trigger })}
      <input id={inputId} ref={inputRef} type="file" accept={accept} className="hidden" aria-hidden="true" onChange={handleFileChange} />
    </>
  );
});
