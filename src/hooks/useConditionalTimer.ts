import { useEffect, useRef } from 'react';

type TimerState = 'running' | 'paused' | 'stopped';

interface TimerConfig {
  readonly callback: () => void;
  readonly duration: number;
  readonly resetTrigger?: unknown;
  readonly state?: TimerState;
}

export function useConditionalTimer({ callback, duration, state = 'running', resetTrigger }: TimerConfig): void {
  const timerIdRef = useRef<number | null>(null);
  const remainingTimeRef = useRef(duration);
  const startTimeRef = useRef<number | null>(null);
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    remainingTimeRef.current = duration;
  }, [duration, resetTrigger]);

  useEffect(() => {
    const clearTimer = () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    };

    if (state === 'running') {
      startTimeRef.current = Date.now();
      clearTimer();
      timerIdRef.current = window.setTimeout(() => {
        savedCallback.current();
      }, remainingTimeRef.current);
    } else if (state === 'paused') {
      clearTimer();
      if (startTimeRef.current !== null) {
        const elapsedTime = Date.now() - startTimeRef.current;
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsedTime);
        startTimeRef.current = null;
      }
    } else {
      clearTimer();
    }

    return clearTimer;
  }, [state, duration, resetTrigger]);
}
