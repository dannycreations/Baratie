import { useCallback, useState } from 'react';

import { useConditionalTimer } from './useConditionalTimer';

interface UseConfirmActionOutput {
  readonly isConfirming: boolean;
  readonly trigger: () => void;
}

export function useConfirmAction(onConfirm: () => void, timeout: number): UseConfirmActionOutput {
  const [isConfirming, setIsConfirming] = useState(false);

  const reset = useCallback(() => {
    setIsConfirming(false);
  }, []);

  useConditionalTimer({
    state: isConfirming ? 'running' : 'stopped',
    callback: reset,
    duration: timeout,
  });

  const trigger = useCallback(() => {
    if (isConfirming) {
      onConfirm();
      setIsConfirming(false);
    } else {
      setIsConfirming(true);
    }
  }, [isConfirming, onConfirm]);

  return { isConfirming, trigger };
}
