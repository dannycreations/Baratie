import { useCallback, useLayoutEffect, useMemo, useState } from 'react';

interface OverflowStatus {
  readonly hasOverflowX: boolean;
  readonly hasOverflowY: boolean;
}

interface OverflowReturn<T extends HTMLElement> {
  readonly ref: (element: T | null) => void;
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
  const [element, setElement] = useState<T | null>(null);
  const [status, setStatus] = useState<OverflowStatus>(INITIAL_STATUS);

  const ref = useCallback((node: T | null) => {
    setElement(node);
  }, []);

  useLayoutEffect(() => {
    if (!element) {
      setStatus(INITIAL_STATUS);
      return;
    }

    let rafId: number | null = null;

    const checkOverflow = (): void => {
      if (rafId !== null) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        rafId = null;
        const hasOverflowX = element.scrollWidth > element.clientWidth;
        const hasOverflowY = element.scrollHeight > element.clientHeight;

        setStatus((currentStatus) => {
          if (currentStatus.hasOverflowX === hasOverflowX && currentStatus.hasOverflowY === hasOverflowY) {
            return currentStatus;
          }
          return { hasOverflowX, hasOverflowY };
        });
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
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [element]);

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
