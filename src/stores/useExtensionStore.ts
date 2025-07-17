import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_EXTENSIONS } from '../app/constants';
import { storage } from '../app/container';

export interface ExtensionManifest {
  readonly entry: string | readonly string[];
  readonly name: string;
}

export interface Extension extends ExtensionManifest {
  readonly errors?: readonly string[];
  readonly id: string;
  readonly ingredients?: readonly symbol[];
  readonly status: 'loading' | 'loaded' | 'error' | 'partial';
  readonly url: string;
}

export type StorableExtension = Omit<Extension, 'status' | 'errors' | 'ingredients'>;

interface ExtensionState {
  readonly add: (extension: Readonly<Extension>) => void;
  readonly extensions: readonly Extension[];
  readonly remove: (id: string) => void;
  readonly setExtensionStatus: (id: string, status: Extension['status'], errors?: readonly string[]) => void;
  readonly setExtensions: (extensions: readonly Extension[]) => void;
  readonly setIngredients: (id: string, ingredients: readonly symbol[]) => void;
}

export const useExtensionStore = create<ExtensionState>()(
  subscribeWithSelector((set) => ({
    extensions: [],

    add(extension) {
      set((state) => ({ extensions: [...state.extensions, extension] }));
    },

    remove(id) {
      set((state) => ({ extensions: state.extensions.filter((ext) => ext.id !== id) }));
    },

    setExtensions(extensions) {
      set({ extensions: [...extensions] });
    },

    setExtensionStatus(id, status, errors) {
      set((state) => ({
        extensions: state.extensions.map((ext) => (ext.id === id ? { ...ext, status, errors } : ext)),
      }));
    },

    setIngredients(id, ingredients) {
      set((state) => ({
        extensions: state.extensions.map((ext) => (ext.id === id ? { ...ext, ingredients } : ext)),
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
