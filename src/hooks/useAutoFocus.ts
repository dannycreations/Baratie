import { useEffect } from 'react';

import { MODAL_SHOW_MS } from '../app/constants';

import type { RefObject } from 'react';

interface AutoFocusOptions {
  readonly delay?: number;
}

export function useAutoFocus<T extends HTMLElement>(elementRef: RefObject<T | null>, isModalOpen: boolean, options?: AutoFocusOptions): void {
  const { delay = MODAL_SHOW_MS } = options || {};

  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        elementRef.current?.focus();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, delay, elementRef]);
}
