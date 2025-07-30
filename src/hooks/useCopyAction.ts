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

  const resetCopiedState = useCallback(() => {
    setIsCopied(false);
  }, []);

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

  useControlTimer({
    callback: resetCopiedState,
    duration: COPY_SHOW_MS,
    reset: isCopied,
    state: isCopied,
  });

  return { isCopied, copy };
}
