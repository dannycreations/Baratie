import { useEffect, useRef } from 'react';

import type { RefObject } from 'react';

const FOCUSABLE_SELECTORS = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])';

interface FocusTrapOptions {
  readonly elementRef: RefObject<HTMLElement | null>;
  readonly isActive: boolean;
}

export function useFocusTrap({ elementRef, isActive }: FocusTrapOptions): void {
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const element = elementRef.current;
    if (!element) {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      lastFocusedRef.current = activeElement;
    }

    element.focus();

    const focusableSel = element.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    const focusableElements = Array.from(focusableSel).filter((el) => !!el.offsetParent);

    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const trapFocus = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') {
        return;
      }

      if (event.shiftKey) {
        if (document.activeElement === firstElement && lastElement instanceof HTMLElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement && firstElement instanceof HTMLElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };

    element.addEventListener('keydown', trapFocus);

    return () => {
      element.removeEventListener('keydown', trapFocus);
      if (lastFocusedRef.current && document.body.contains(lastFocusedRef.current)) {
        lastFocusedRef.current.focus();
      }
      lastFocusedRef.current = null;
    };
  }, [isActive, elementRef]);
}
