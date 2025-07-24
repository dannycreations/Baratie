import { create } from 'zustand';

import type { ExtensionModalProps } from '../components/setting/ExtensionModal';
import type { CookbookModalProps } from './useCookbookStore';

interface ModalMap {
  readonly cookbook: CookbookModalProps;
  readonly ingredientManager: undefined;
  readonly settings: undefined;
  readonly extensionInstall: ExtensionModalProps;
}

type ModalType = keyof ModalMap;

interface ModalState {
  readonly activeModal: ModalType | null;
  readonly modalProps: unknown;
  readonly previousModals: Array<{ type: ModalType; props: unknown }>;
  readonly openModal: <T extends ModalType>(type: T, props: ModalMap[T], options?: { replace?: boolean }) => void;
  readonly closeModal: () => void;
}

export const useModalStore = create<ModalState>()((set, get) => ({
  activeModal: null,
  modalProps: null,
  previousModals: [],

  openModal: (type, props, options) => {
    const { activeModal, modalProps } = get();
    const newPreviousModals = [...get().previousModals];
    if (activeModal && !options?.replace) {
      newPreviousModals.push({ type: activeModal, props: modalProps });
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
