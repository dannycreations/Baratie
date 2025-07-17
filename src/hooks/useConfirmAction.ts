import { useCallback, useState } from 'react';

import { useControlTimer } from './useControlTimer';

interface ConfirmActionReturn {
  readonly isConfirm: boolean;
  readonly trigger: () => void;
}

export function useConfirmAction(callback: () => void, timeout: number): ConfirmActionReturn {
  const [isConfirm, setIsConfirm] = useState(false);

  const handleConfirm = useCallback(() => {
    setIsConfirm(false);
  }, []);

  useControlTimer({
    state: isConfirm,
    callback: handleConfirm,
    duration: timeout,
    reset: isConfirm,
  });

  const trigger = useCallback(() => {
    if (isConfirm) {
      callback();
      setIsConfirm(false);
    } else {
      setIsConfirm(true);
    }
  }, [isConfirm, callback]);

  return { isConfirm, trigger };
}
