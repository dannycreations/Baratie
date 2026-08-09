import { useEffect } from 'react';

import { MODAL_SHOW_MS } from '../app/constants';

import type { RefObject } from 'react';

export const useAutoFocus = <T extends HTMLElement>(elementRef: RefObject<T | null>, isActive: boolean): void => {
  useEffect(() => {
    if (isActive) {
      const timer = window.setTimeout(() => {
        elementRef.current?.focus();
      }, MODAL_SHOW_MS);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isActive, elementRef]);
};
