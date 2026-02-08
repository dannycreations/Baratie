import { create } from 'zustand';

import { createStackHandlers } from '../utilities/storeUtil';

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

export const useModalStore = create<ModalState>()((set, get) => {
  const stackHandlers = createStackHandlers<ModalState, 'previousModals', ModalPayload>(set, 'previousModals');

  return {
    currentModal: null,
    previousModals: [],

    openModal: (payload, options) => {
      const { currentModal } = get();

      if (currentModal && !options?.replace) {
        stackHandlers.push(currentModal);
      }

      set({ currentModal: payload });
    },

    closeModal: () => {
      const { previousModals } = get();
      const lastModal = previousModals[previousModals.length - 1] || null;

      set({ currentModal: lastModal });
      stackHandlers.pop();
    },
  };
});
