import { useEffect, useRef } from 'react';

interface ControlTimerProps {
  readonly callback: () => void;
  readonly duration: number;
  readonly reset?: unknown;
  readonly state?: boolean;
}

export function useControlTimer({ callback, duration, state = true, reset }: ControlTimerProps): void {
  const savedCallback = useRef(callback);

  const lastRunInfo = useRef({
    duration,
    reset,
  });

  const timerState = useRef({
    id: null as number | null,
    startTime: 0,
    remaining: duration,
  });

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const clearTimer = (): void => {
      if (timerState.current.id) {
        clearTimeout(timerState.current.id);
        timerState.current.id = null;
      }
    };

    if (lastRunInfo.current.duration !== duration || lastRunInfo.current.reset !== reset) {
      timerState.current.remaining = duration;
      lastRunInfo.current = {
        duration,
        reset,
      };
    }

    if (state) {
      clearTimer();
      timerState.current.startTime = Date.now();
      timerState.current.id = window.setTimeout(() => {
        savedCallback.current();
      }, timerState.current.remaining);
    } else {
      if (timerState.current.id) {
        clearTimer();
        const elapsed = Date.now() - timerState.current.startTime;
        timerState.current.remaining = Math.max(0, timerState.current.remaining - elapsed);
      }
    }

    return clearTimer;
  }, [state, duration, reset]);
}
