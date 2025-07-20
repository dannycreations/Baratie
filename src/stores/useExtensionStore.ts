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
  readonly fetchedAt?: number;
  readonly id: string;
  readonly ingredients?: readonly symbol[];
  readonly scripts?: Readonly<Record<string, string>>;
  readonly status: 'loading' | 'loaded' | 'error' | 'partial';
}

export type StorableExtension = Omit<Extension, 'status' | 'errors' | 'ingredients' | 'scripts'> & {
  readonly fetchedAt: number;
  readonly scripts: Readonly<Record<string, string>>;
};

interface ExtensionState {
  readonly add: (extension: Readonly<Extension>) => void;
  readonly extensions: readonly Extension[];
  readonly remove: (id: string) => void;
  readonly setExtensionStatus: (id: string, status: Extension['status'], errors?: readonly string[]) => void;
  readonly setExtensions: (extensions: readonly Extension[]) => void;
  readonly setIngredients: (id: string, ingredients: readonly symbol[]) => void;
  readonly upsert: (extension: Readonly<Partial<Extension> & { id: string }>) => void;
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
        extensions: state.extensions.map((ext) => {
          if (ext.id === id) {
            const updates: Partial<Extension> = {
              status,
              errors,
              ...((status === 'loaded' || status === 'partial') && { fetchedAt: Date.now() }),
            };
            return { ...ext, ...updates };
          }
          return ext;
        }),
      }));
    },

    setIngredients(id, ingredients) {
      set((state) => ({
        extensions: state.extensions.map((ext) => (ext.id === id ? { ...ext, ingredients } : ext)),
      }));
    },

    upsert(extension) {
      set((state) => {
        const index = state.extensions.findIndex((e) => e.id === extension.id);
        if (index > -1) {
          const newExtensions = [...state.extensions];
          newExtensions[index] = { ...newExtensions[index], ...extension };
          return { extensions: newExtensions };
        }
        return { extensions: [...state.extensions, extension as Extension] };
      });
    },
  })),
);

useExtensionStore.subscribe(
  (state) => state.extensions,
  (extensions) => {
    const storable: StorableExtension[] = extensions
      .filter(
        (ext): ext is Extension & { fetchedAt: number; scripts: Readonly<Record<string, string>> } =>
          (ext.status === 'loaded' || ext.status === 'partial') && typeof ext.fetchedAt === 'number' && !!ext.scripts,
      )
      .map(({ id, name, entry, fetchedAt, scripts }) => ({ id, name, entry, fetchedAt, scripts: scripts! }));
    storage.set(STORAGE_EXTENSIONS, storable, 'Extensions');
  },
);
