import { cn } from 'cnfast';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';

import type { JSX, ReactNode } from 'react';

interface OverflowStatus {
  readonly hasOverflowX: boolean;
  readonly hasOverflowY: boolean;
}

const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

const INITIAL_STATUS: OverflowStatus = {
  hasOverflowX: false,
  hasOverflowY: false,
};

interface ScrollAreaProps {
  readonly children?: ReactNode;
  readonly className?: string;
}

export const ScrollArea = ({ children, className }: ScrollAreaProps): JSX.Element => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<OverflowStatus>(INITIAL_STATUS);

  const ref = useCallback((node: HTMLDivElement | null) => {
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

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      resizeObserver.disconnect();
    };
  }, [element]);

  const overflowClasses = useMemo(() => {
    if (isTouchDevice()) {
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

  return (
    <div ref={ref} className={cn(className, overflowClasses)}>
      {children}
    </div>
  );
};
