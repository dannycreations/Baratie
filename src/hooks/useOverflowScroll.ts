import { useLayoutEffect, useRef, useState } from 'react';

import type { RefObject } from 'react';

interface OverflowStatus {
  readonly hasOverflowX: boolean;
  readonly hasOverflowY: boolean;
}

const INITIAL_STATUS: OverflowStatus = {
  hasOverflowX: false,
  hasOverflowY: false,
};

export function useOverflowStatus<T extends HTMLElement>(elementRef: RefObject<T | null>): OverflowStatus {
  const [status, setStatus] = useState<OverflowStatus>(INITIAL_STATUS);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const checkOverflow = (): void => {
      const hasOverflowY = element.scrollHeight > element.clientHeight;
      const hasOverflowX = element.scrollWidth > element.clientWidth;
      setStatus((current) => {
        if (current.hasOverflowX === hasOverflowX && current.hasOverflowY === hasOverflowY) {
          return current;
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
  }, [elementRef]);

  return status;
}

const OVERFLOW_X_CLASSNAME = 'overflow-x-hidden';
const OVERFLOW_Y_CLASSNAME = 'overflow-y-hidden';

interface OverflowScrollProps {
  readonly xClasses?: string;
  readonly yClasses?: string;
}

interface OverflowScrollReturn<T extends HTMLElement> {
  readonly ref: RefObject<T | null>;
  readonly className: string;
}

export function useOverflowScroll<T extends HTMLElement>({ xClasses, yClasses }: OverflowScrollProps): OverflowScrollReturn<T> {
  const ref = useRef<T>(null);
  const { hasOverflowX, hasOverflowY } = useOverflowStatus(ref);

  const finalXClasses = hasOverflowX ? xClasses || '' : '';
  const finalYClasses = hasOverflowY ? yClasses || '' : '';
  const overflowXHidden = !!yClasses && !xClasses && hasOverflowY ? OVERFLOW_X_CLASSNAME : '';
  const overflowYHidden = !!xClasses && !yClasses && hasOverflowX ? OVERFLOW_Y_CLASSNAME : '';

  const className = [finalXClasses, finalYClasses, overflowXHidden, overflowYHidden].filter(Boolean).join(' ');

  return { ref, className };
}
