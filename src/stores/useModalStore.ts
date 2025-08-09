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

export const useModalStore = create<ModalState>()((set, get) => ({
  currentModal: null,
  previousModals: [],

  openModal: (payload, options) => {
    const { currentModal, previousModals } = get();
    const newPreviousModals = [...previousModals];

    if (currentModal && !options?.replace) {
      newPreviousModals.push(currentModal);
    }

    set({
      currentModal: payload,
      previousModals: newPreviousModals,
    });
  },

  closeModal: () => {
    const { previousModals } = get();
    const newPreviousModals = [...previousModals];
    const lastPrevious = newPreviousModals.pop();

    set({
      currentModal: lastPrevious || null,
      previousModals: newPreviousModals,
    });
  },
}));
