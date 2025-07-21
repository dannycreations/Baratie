import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_EXTENSIONS } from '../app/constants';
import { storage } from '../app/container';

export interface Extension {
  readonly entry?: string | readonly string[];
  readonly errors?: readonly string[];
  readonly fetchedAt?: number;
  readonly id: string;
  readonly ingredients?: readonly symbol[];
  readonly name?: string;
  readonly scripts?: Readonly<Record<string, string>>;
  readonly status: 'loading' | 'loaded' | 'error' | 'partial';
}

interface ExtensionState {
  readonly extensions: readonly Extension[];
  readonly extensionMap: ReadonlyMap<string, Extension>;
  readonly remove: (id: string) => void;
  readonly setExtensionStatus: (id: string, status: Extension['status'], errors?: readonly string[]) => void;
  readonly setExtensions: (extensions: readonly Extension[]) => void;
  readonly setIngredients: (id: string, ingredients: readonly symbol[]) => void;
  readonly upsert: (extension: Readonly<Partial<Extension> & { id: string }>) => void;
}

const updateStateWithExtensions = (extensions: readonly Extension[]) => {
  return {
    extensions,
    extensionMap: new Map(extensions.map((ext) => [ext.id, ext])),
  };
};

export const useExtensionStore = create<ExtensionState>()(
  subscribeWithSelector((set) => ({
    extensions: [],
    extensionMap: new Map(),

    remove(id) {
      set((state) => {
        const newExtensions = state.extensions.filter((ext) => ext.id !== id);
        if (newExtensions.length === state.extensions.length) {
          return {}; // No change
        }
        return updateStateWithExtensions(newExtensions);
      });
    },

    setExtensions(extensions) {
      set(updateStateWithExtensions(extensions));
    },

    setExtensionStatus(id, status, errors) {
      set((state) => {
        const index = state.extensions.findIndex((ext) => ext.id === id);
        if (index === -1) {
          return {}; // Not found
        }
        const newExtensions = [...state.extensions];
        const updates: Partial<Extension> = {
          status,
          errors,
          ...((status === 'loaded' || status === 'partial') && { fetchedAt: Date.now() }),
        };
        newExtensions[index] = { ...newExtensions[index], ...updates };
        return updateStateWithExtensions(newExtensions);
      });
    },

    setIngredients(id, ingredients) {
      set((state) => {
        const index = state.extensions.findIndex((ext) => ext.id === id);
        if (index === -1) {
          return {}; // Not found
        }
        const newExtensions = [...state.extensions];
        newExtensions[index] = { ...newExtensions[index], ingredients };
        return updateStateWithExtensions(newExtensions);
      });
    },

    upsert(extension) {
      set((state) => {
        const index = state.extensions.findIndex((e) => e.id === extension.id);
        const newExtensions = [...state.extensions];
        if (index !== -1) {
          newExtensions[index] = { ...newExtensions[index], ...extension } as Extension;
        } else {
          newExtensions.push(extension as Extension);
        }
        return updateStateWithExtensions(newExtensions);
      });
    },
  })),
);

useExtensionStore.subscribe(
  (state) => state.extensions,
  (extensions) => {
    const storable = extensions
      .filter(
        (ext): ext is Extension & { name: string; fetchedAt: number; scripts: Readonly<Record<string, string>> } =>
          (ext.status === 'loaded' || ext.status === 'partial') &&
          !!ext.name &&
          typeof ext.fetchedAt === 'number' &&
          !!ext.scripts &&
          Object.keys(ext.scripts).length > 0,
      )
      .map(({ id, name, fetchedAt, scripts }) => ({
        id,
        name,
        fetchedAt,
        scripts: { ...scripts },
      }));
    storage.set(STORAGE_EXTENSIONS, storable, 'Extensions');
  },
);
