import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_EXTENSIONS } from '../app/constants';
import { storage } from '../app/container';

export interface ExtensionManifest {
  readonly name: string;
  readonly entry: string | readonly string[];
}

export interface Extension extends ExtensionManifest {
  readonly id: string;
  readonly url: string;
  readonly status: 'loading' | 'loaded' | 'error' | 'partial';
  readonly errors?: readonly string[];
}

type StorableExtension = Omit<Extension, 'status' | 'errors'>;

interface ExtensionState {
  readonly extensions: readonly Extension[];
  readonly addExtension: (extension: Extension) => void;
  readonly remove: (id: string) => void;
  readonly setExtensions: (extensions: readonly Extension[]) => void;
  readonly setExtensionStatus: (id: string, status: Extension['status'], errors?: readonly string[]) => void;
}

export const useExtensionStore = create<ExtensionState>()(
  subscribeWithSelector((set, get) => ({
    extensions: [],

    addExtension(extension) {
      if (get().extensions.some((ext) => ext.id === extension.id)) {
        return;
      }
      set((state) => ({ extensions: [...state.extensions, extension] }));
    },

    remove(id) {
      set((state) => ({
        extensions: state.extensions.filter((ext) => ext.id !== id),
      }));
    },

    setExtensions(extensions) {
      set({ extensions: [...extensions] });
    },

    setExtensionStatus(id, status, errors) {
      set((state) => ({
        extensions: state.extensions.map((ext) => (ext.id === id ? { ...ext, status, errors } : ext)),
      }));
    },
  })),
);

useExtensionStore.subscribe(
  (state) => state.extensions,
  (extensions) => {
    const storable: StorableExtension[] = extensions.map(({ id, url, name, entry }) => ({ id, url, name, entry }));
    storage.set(STORAGE_EXTENSIONS, storable, 'Extensions');
  },
);
