import { useCallback, useEffect, useRef } from 'react';

import type { RefObject } from 'react';

interface ScrollConfig {
  readonly xClassName?: string;
  readonly yClassName?: string;
}

const OVERFLOW_X_CLASSNAME = 'overflow-x-hidden';
const OVERFLOW_Y_CLASSNAME = 'overflow-y-hidden';

export function useOverflowScroll<T extends HTMLElement>({ xClassName, yClassName }: ScrollConfig): RefObject<T | null> {
  const ref = useRef<T>(null);

  const manageClasses = useCallback((): void => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const hasVerticalScroll = element.scrollHeight > element.clientHeight;
    const hasHorizontalScroll = element.scrollWidth > element.clientWidth;

    const toggleClasses = (classString: string | undefined, condition: boolean): void => {
      if (!classString) return;
      classString
        .split(' ')
        .filter(Boolean)
        .forEach((className) => element.classList.toggle(className, condition));
    };

    toggleClasses(yClassName, hasVerticalScroll);
    toggleClasses(xClassName, hasHorizontalScroll);

    const manageVertical = !!yClassName;
    const manageHorizontal = !!xClassName;

    element.classList.toggle(OVERFLOW_X_CLASSNAME, manageVertical && !manageHorizontal);
    element.classList.toggle(OVERFLOW_Y_CLASSNAME, manageHorizontal && !manageVertical);
  }, [xClassName, yClassName]);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    manageClasses();

    const resizeObserver = new ResizeObserver(manageClasses);
    resizeObserver.observe(element);

    const mutationObserver = new MutationObserver(manageClasses);
    mutationObserver.observe(element, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();

      const removeClasses = (classString: string | undefined): void => {
        if (!classString) return;
        classString
          .split(' ')
          .filter(Boolean)
          .forEach((className) => element.classList.remove(className));
      };

      if (element) {
        removeClasses(yClassName);
        removeClasses(xClassName);
        element.classList.remove(OVERFLOW_X_CLASSNAME, OVERFLOW_Y_CLASSNAME);
      }
    };
  }, [manageClasses, xClassName, yClassName]);

  return ref;
}
