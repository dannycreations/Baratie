import { useCallback, useEffect, useRef } from 'react';

interface LongPressOptions {
  readonly delay?: number;
  readonly interval?: number;
  readonly onStart?: () => void;
  readonly onEnd?: () => void;
}

export const useLongPress = (
  callback: () => void,
  { delay = 300, onStart, onEnd }: LongPressOptions = {},
): {
  readonly onMouseDown: () => void;
  readonly onMouseUp: () => void;
  readonly onMouseLeave: () => void;
  readonly onTouchStart: () => void;
  readonly onTouchEnd: () => void;
} => {
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
      clearTimeout(intervalRef.current);
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

    const initialInterval = 120;
    const minInterval = 30;
    const acceleration = 1.1;

    let currentInterval = initialInterval;

    const repeater = (): void => {
      callbackRef.current();
      currentInterval = Math.max(minInterval, currentInterval / acceleration);
      intervalRef.current = window.setTimeout(repeater, currentInterval);
    };

    timeoutRef.current = window.setTimeout(repeater, delay);
  }, [delay, stop]);

  useEffect(() => {
    return () => stop(true);
  }, [stop]);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
};
