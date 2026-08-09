import { create } from 'zustand';

import type { ExtensionManifest } from '../helpers/extensionHelper';
import type { CookbookModalProps } from './useCookbookStore';

interface ModalMap {
  readonly cookbook: CookbookModalProps;
  readonly ingredient: undefined;
  readonly settings: undefined;
  readonly extension: {
    readonly id: string;
    readonly manifest: ExtensionManifest;
  };
}

type ModalType = keyof ModalMap;

type ModalPayload = { [K in ModalType]: { type: K; props: ModalMap[K] } }[ModalType];

interface ModalState {
  readonly currentModal: ModalPayload | null;
  readonly previousModals: ReadonlyArray<ModalPayload>;
  readonly openModal: (payload: ModalPayload, options?: Readonly<{ replace?: boolean }>) => void;
  readonly closeModal: () => void;
}

export const useModalStore = create<ModalState>()((set) => ({
  currentModal: null,
  previousModals: [],

  openModal: (payload, options) => {
    set((state) => {
      const shouldStack = state.currentModal && !options?.replace;
      return {
        currentModal: payload,
        previousModals: shouldStack ? [...state.previousModals, state.currentModal!] : state.previousModals,
      };
    });
  },

  closeModal: () => {
    set((state) => ({
      currentModal: state.previousModals[state.previousModals.length - 1] ?? null,
      previousModals: state.previousModals.slice(0, -1),
    }));
  },
}));
