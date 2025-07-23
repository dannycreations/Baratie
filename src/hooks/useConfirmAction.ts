import { useCallback, useEffect, useRef, useState } from 'react';

import { useControlTimer } from './useControlTimer';

interface ConfirmActionReturn {
  readonly isConfirm: boolean;
  readonly trigger: () => void;
}

export function useConfirmAction(callback: () => void, timeout: number): ConfirmActionReturn {
  const [isConfirm, setIsConfirm] = useState(false);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const resetConfirm = useCallback(() => {
    setIsConfirm(false);
  }, []);

  useControlTimer({
    callback: resetConfirm,
    duration: timeout,
    reset: isConfirm,
    state: isConfirm,
  });

  const trigger = useCallback(() => {
    setIsConfirm((current) => {
      if (current) {
        callbackRef.current();
        return false;
      }
      return true;
    });
  }, []);

  return { isConfirm, trigger };
}
