import { useEffect, useRef } from 'react';

interface ControlTimerProps {
  readonly callback: () => void;
  readonly duration: number;
  readonly reset?: unknown;
  readonly state?: boolean;
}

export function useControlTimer({ callback, duration, state = true, reset }: ControlTimerProps): void {
  const timerIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const remainingTimeRef = useRef(duration);
  const callbackRef = useRef<() => void>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    remainingTimeRef.current = duration;
  }, [duration, reset]);

  useEffect(() => {
    const clearTimer = (): void => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    };

    if (state) {
      clearTimer();
      startTimeRef.current = Date.now();
      timerIdRef.current = window.setTimeout(() => {
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
  }, [state, duration, reset]);
}
