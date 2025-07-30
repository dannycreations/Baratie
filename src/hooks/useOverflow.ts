import { useLayoutEffect, useRef, useState } from 'react';

import type { RefObject } from 'react';

interface OverflowReturn<T extends HTMLElement> {
  readonly ref: RefObject<T | null>;
  readonly hasOverflowX: boolean;
  readonly hasOverflowY: boolean;
}

interface OverflowStatus {
  readonly hasOverflowX: boolean;
  readonly hasOverflowY: boolean;
}

const INITIAL_STATUS: OverflowStatus = {
  hasOverflowX: false,
  hasOverflowY: false,
};

export function useOverflow<T extends HTMLElement>(): OverflowReturn<T> {
  const ref = useRef<T>(null);
  const [status, setStatus] = useState<OverflowStatus>(INITIAL_STATUS);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const checkOverflow = (): void => {
      const hasOverflowX = element.scrollWidth > element.clientWidth;
      const hasOverflowY = element.scrollHeight > element.clientHeight;

      setStatus((currentStatus) => {
        if (currentStatus.hasOverflowX === hasOverflowX && currentStatus.hasOverflowY === hasOverflowY) {
          return currentStatus;
        }
        return { hasOverflowX, hasOverflowY };
      });
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(element);

    const mutationObserver = new MutationObserver(checkOverflow);
    mutationObserver.observe(element, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [ref]);

  return { ref, ...status };
}
