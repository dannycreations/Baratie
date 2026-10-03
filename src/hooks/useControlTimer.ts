import { useEffect, useRef } from 'react';

interface ControlTimerProps {
  readonly callback: () => void;
  readonly duration: number;
  readonly active?: boolean;
  readonly restartKey?: unknown;
}

export const useControlTimer = ({ callback, duration, active = true, restartKey }: ControlTimerProps): void => {
  const timerIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const remainingTimeRef = useRef(duration);
  const callbackRef = useRef<() => void>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    remainingTimeRef.current = duration;
  }, [duration, restartKey]);

  useEffect(() => {
    const clearTimer = (): void => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    };

    if (active) {
      clearTimer();
      startTimeRef.current = Date.now();
      timerIdRef.current = window.setTimeout(() => {
        // Clearing the start time keeps elapsed time from a consumed timer out of
        // the next activation; only a paused timer may resume a shortened window.
        startTimeRef.current = null;
        callbackRef.current();
      }, remainingTimeRef.current);
    } else {
      clearTimer();
      if (startTimeRef.current !== null) {
        const elapsedTime = Date.now() - startTimeRef.current;
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsedTime);
        startTimeRef.current = null;
      }
    }

    return clearTimer;
  }, [active, duration, restartKey]);
};
