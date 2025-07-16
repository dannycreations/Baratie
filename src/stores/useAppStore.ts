import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

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
