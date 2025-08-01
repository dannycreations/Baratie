import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface TaskState {
  readonly isInitialized: boolean;
  readonly loadingHasError: boolean;
  readonly loadingMessage: string;
  readonly setInitialized: (isReady: boolean) => void;
  readonly setLoadingMessage: (message: string, hasError?: boolean) => void;
}

export const useTaskStore = create<TaskState>()(
  subscribeWithSelector((set) => ({
    isInitialized: false,
    loadingHasError: false,
    loadingMessage: 'Firing up the galley...',

    setInitialized: (isReady) => {
      set({
        isInitialized: isReady,
      });
    },

    setLoadingMessage: (message, hasError = false) => {
      set({
        loadingMessage: message,
        loadingHasError: hasError,
      });
    },
  })),
);
