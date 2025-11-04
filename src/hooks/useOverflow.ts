import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { RefObject } from 'react';

interface OverflowStatus {
  readonly hasOverflowX: boolean;
  readonly hasOverflowY: boolean;
}

interface OverflowReturn<T extends HTMLElement> {
  readonly ref: RefObject<T | null>;
  readonly className: string;
}

const INITIAL_STATUS: OverflowStatus = {
  hasOverflowX: false,
  hasOverflowY: false,
};

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

const isMobile = isTouchDevice();

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

  const className = useMemo(() => {
    if (isMobile) {
      return 'scrollbar-hidden';
    }

    const classParts: string[] = [];
    if (status.hasOverflowY && !status.hasOverflowX) {
      classParts.push('overflow-x-hidden');
    } else if (status.hasOverflowX && !status.hasOverflowY) {
      classParts.push('overflow-y-hidden');
    }

    if (status.hasOverflowY) {
      classParts.push('pr-1');
    }

    return classParts.join(' ');
  }, [status.hasOverflowX, status.hasOverflowY]);

  return { ref, className };
}
