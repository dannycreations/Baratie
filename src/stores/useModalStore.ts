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
  readonly activeModal: ModalType | null;
  readonly modalProps: unknown;
  readonly previousModals: ReadonlyArray<ModalPayload>;
  readonly getModal: <T extends ModalType>(type: T) => ModalMap[T];
  readonly openModal: <T extends ModalType>(type: T, props?: ModalMap[T], options?: { readonly replace?: boolean }) => void;
  readonly closeModal: () => void;
}

export const useModalStore = create<ModalState>()((set, get) => ({
  activeModal: null,
  modalProps: null,
  previousModals: [],

  getModal<T extends ModalType>(type: T) {
    const { modalProps } = get();
    return modalProps as ModalMap[typeof type];
  },

  openModal: <T extends ModalType>(type: T, props?: ModalMap[T], options?: { readonly replace?: boolean }) => {
    const { activeModal, modalProps, previousModals } = get();
    const newPreviousModals = [...previousModals];

    if (activeModal && !options?.replace) {
      newPreviousModals.push({
        type: activeModal,
        props: modalProps,
      } as ModalPayload);
    }

    set({
      activeModal: type,
      modalProps: props,
      previousModals: newPreviousModals,
    });
  },

  closeModal: () => {
    const { previousModals } = get();
    const newPreviousModals = [...previousModals];
    const lastPrevious = newPreviousModals.pop();

    if (lastPrevious) {
      set({
        activeModal: lastPrevious.type,
        modalProps: lastPrevious.props,
        previousModals: newPreviousModals,
      });
    } else {
      set({
        activeModal: null,
        modalProps: null,
        previousModals: [],
      });
    }
  },
}));
