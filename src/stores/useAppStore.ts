import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { APP_STYLES } from '../app/styles';

const APP_GLOBAL_STYLES = 'baratie-global-styles';

interface AppState {
  readonly isInitialized: boolean;
  readonly loadingMessage: string;
  readonly loadingHasError: boolean;
  readonly setInitialized: (isReady: boolean) => void;
  readonly setLoadingMessage: (message: string, hasError?: boolean) => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set) => ({
    isInitialized: false,
    loadingMessage: 'Firing up the galley...',
    loadingHasError: false,

    setInitialized(isReady: boolean): void {
      set({ isInitialized: isReady });
    },

    setLoadingMessage(message: string, hasError = false): void {
      set({ loadingMessage: message, loadingHasError: hasError });
    },
  })),
);

useAppStore.subscribe(
  (state) => state.isInitialized,
  (status) => {
    if (!status && !document.getElementById(APP_GLOBAL_STYLES)) {
      const style = document.createElement('style');
      style.id = APP_GLOBAL_STYLES;
      style.textContent = APP_STYLES;
      document.head.appendChild(style);
    }
  },
  { fireImmediately: true },
);
