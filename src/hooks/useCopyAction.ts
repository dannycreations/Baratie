import { useCallback, useState } from 'react';

import { COPY_SHOW_MS } from '../app/constants';
import { errorHandler } from '../app/container';
import { useControlTimer } from './useControlTimer';

interface CopyActionReturn {
  readonly isCopied: boolean;
  readonly copy: (textToCopy: string) => Promise<void>;
}

export function useCopyAction(): CopyActionReturn {
  const [isCopied, setIsCopied] = useState(false);

  const resetCopied = useCallback(() => {
    setIsCopied(false);
  }, []);

  useControlTimer({
    callback: resetCopied,
    duration: COPY_SHOW_MS,
    reset: isCopied,
    state: isCopied,
  });

  const copy = useCallback(async (textToCopy: string): Promise<void> => {
    if (!textToCopy) {
      return;
    }
    const { error } = await errorHandler.attemptAsync(() => {
      return navigator.clipboard.writeText(textToCopy);
    }, 'Clipboard Copy');
    if (!error) {
      setIsCopied(true);
    }
  }, []);

  return { isCopied, copy };
}
