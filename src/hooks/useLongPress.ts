import { useCallback, useEffect, useRef } from 'react';

interface LongPressOptions {
  readonly delay?: number;
  readonly interval?: number;
  readonly onStart?: () => void;
  readonly onEnd?: () => void;
}

export function useLongPress(
  callback: () => void,
  { delay = 300, interval = 100, onStart, onEnd }: LongPressOptions = {},
): {
  readonly onMouseDown: () => void;
  readonly onMouseUp: () => void;
  readonly onMouseLeave: () => void;
  readonly onTouchStart: () => void;
  readonly onTouchEnd: () => void;
} {
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const savedCallback = useRef(callback);
  const savedOnStart = useRef(onStart);
  const savedOnEnd = useRef(onEnd);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    savedOnStart.current = onStart;
    savedOnEnd.current = onEnd;
  }, [onStart, onEnd]);

  const stop = useCallback((shouldCallOnEnd = true) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (shouldCallOnEnd) {
      savedOnEnd.current?.();
    }
  }, []);

  const start = useCallback(() => {
    savedOnStart.current?.();
    stop(false);
    savedCallback.current();
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => {
        savedCallback.current();
      }, interval);
    }, delay);
  }, [delay, interval, stop]);

  useEffect(() => {
    return () => stop(true);
  }, [stop]);

  return {
    onMouseDown: start,
    onMouseUp: () => stop(true),
    onMouseLeave: () => stop(true),
    onTouchStart: start,
    onTouchEnd: () => stop(true),
  };
}
