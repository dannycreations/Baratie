import { useCallback, useEffect, useRef } from 'react';

import type { RefObject } from 'react';

const OVERFLOW_X_CLASSNAME = 'overflow-x-hidden';
const OVERFLOW_Y_CLASSNAME = 'overflow-y-hidden';

interface OverflowScrollProps {
  readonly xClasses?: string;
  readonly yClasses?: string;
}

export function useOverflowScroll<T extends HTMLElement>({ xClasses, yClasses }: OverflowScrollProps): RefObject<T | null> {
  const scrollRef = useRef<T>(null);

  const manageClasses = useCallback((): void => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const hasVerticalScroll = element.scrollHeight > element.clientHeight;
    const hasHorizontalScroll = element.scrollWidth > element.clientWidth;

    const toggleClasses = (classString: string | undefined, condition: boolean): void => {
      if (!classString) {
        return;
      }
      classString
        .split(' ')
        .filter(Boolean)
        .forEach((className) => {
          element.classList.toggle(className, condition);
        });
    };

    toggleClasses(yClasses, hasVerticalScroll);
    toggleClasses(xClasses, hasHorizontalScroll);

    const manageVertical = !!yClasses;
    const manageHorizontal = !!xClasses;

    element.classList.toggle(OVERFLOW_X_CLASSNAME, manageVertical && !manageHorizontal);
    element.classList.toggle(OVERFLOW_Y_CLASSNAME, manageHorizontal && !manageVertical);
  }, [xClasses, yClasses]);

  useEffect(() => {
    const element = scrollRef.current;
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
        if (!classString) {
          return;
        }
        classString
          .split(' ')
          .filter(Boolean)
          .forEach((className) => {
            element.classList.remove(className);
          });
      };
      if (element) {
        removeClasses(yClasses);
        removeClasses(xClasses);
        element.classList.remove(OVERFLOW_X_CLASSNAME, OVERFLOW_Y_CLASSNAME);
      }
    };
  }, [manageClasses, xClasses, yClasses]);

  return scrollRef;
}
