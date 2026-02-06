import { useCallback, useEffect, useRef, useState } from 'react';

import { useControlTimer } from './useControlTimer';

interface ConfirmActionReturn {
  readonly isConfirm: boolean;
  readonly trigger: () => void;
}

export const useConfirmAction = (callback: () => void, timeout: number): ConfirmActionReturn => {
  const [isConfirm, setIsConfirm] = useState(false);

  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const resetConfirm = useCallback(() => {
    setIsConfirm(false);
  }, []);

  const trigger = useCallback(() => {
    setIsConfirm((isCurrentlyConfirm) => {
      if (isCurrentlyConfirm) {
        callbackRef.current();
        return false;
      }
      return true;
    });
  }, []);

  useControlTimer({
    callback: resetConfirm,
    duration: timeout,
    reset: isConfirm,
    state: isConfirm,
  });

  return {
    isConfirm,
    trigger,
  };
};
