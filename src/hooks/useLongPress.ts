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
  const callbackRef = useRef(callback);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
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
      onEndRef.current?.();
    }
  }, []);

  const start = useCallback(() => {
    onStartRef.current?.();
    stop(false);
    callbackRef.current();
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => {
        callbackRef.current();
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
