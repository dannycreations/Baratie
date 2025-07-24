import * as v from 'valibot';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_EXTENSIONS } from '../app/constants';
import { ingredientRegistry, logger, storage } from '../app/container';
import {
  ExtensionManifestSchema,
  isCacheValid,
  loadAndExecuteExtension,
  parseGitHubUrl,
  updateStateWithExtensions,
} from '../helpers/extensionHelper';
import { useFavoriteStore } from './useFavoriteStore';
import { useNotificationStore } from './useNotificationStore';
import { useRecipeStore } from './useRecipeStore';
import { useSettingStore } from './useSettingStore';

import type { ExtensionManifest } from '../helpers/extensionHelper';

const StorableExtensionSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  name: v.pipe(v.string(), v.nonEmpty()),
  fetchedAt: v.number(),
  scripts: v.record(v.string(), v.pipe(v.string(), v.nonEmpty())),
  entry: v.optional(
    v.union([
      v.string(),
      v.array(v.string()),
      v.array(v.object({ name: v.string(), category: v.string(), description: v.string(), entry: v.string() })),
    ]),
  ),
});

export type StorableExtension = v.InferInput<typeof StorableExtensionSchema>;

export interface ManifestModule {
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly entry: string;
}

export interface Extension {
  readonly entry?: string | ReadonlyArray<string> | ReadonlyArray<ManifestModule>;
  readonly errors?: ReadonlyArray<string>;
  readonly fetchedAt?: number;
  readonly id: string;
  readonly ingredients?: ReadonlyArray<string>;
  readonly name: string;
  readonly scripts?: Readonly<Record<string, string>>;
  readonly status: 'loading' | 'loaded' | 'error' | 'partial';
}

interface ExtensionState {
  readonly extensions: ReadonlyArray<Extension>;
  readonly extensionMap: ReadonlyMap<string, Extension>;
  readonly pendingSelection: { readonly id: string; readonly manifest: ExtensionManifest } | null;
  readonly add: (url: string) => Promise<void>;
  readonly cancelPendingInstall: () => void;
  readonly init: () => Promise<void>;
  readonly installSelectedModules: (id: string, selectedModules: ReadonlyArray<ManifestModule>) => Promise<void>;
  readonly refresh: (id: string) => Promise<void>;
  readonly remove: (id: string) => void;
  readonly setExtensionStatus: (id: string, status: Extension['status'], errors?: ReadonlyArray<string>) => void;
  readonly setExtensions: (extensions: ReadonlyArray<Extension>) => void;
  readonly setIngredients: (id: string, ingredients: ReadonlyArray<string>) => void;
  readonly setPendingSelection: (pending: { readonly id: string; readonly manifest: ExtensionManifest } | null) => void;
  readonly upsert: (extension: Readonly<Partial<Extension> & { id: string }>) => void;
}

export interface LoadExtensionDependencies {
  readonly getExtensionMap: () => ReadonlyMap<string, Extension>;
  readonly setExtensionStatus: (id: string, status: Extension['status'], errors?: ReadonlyArray<string>) => void;
  readonly setIngredients: (id: string, ingredients: ReadonlyArray<string>) => void;
  readonly upsert: (extension: Readonly<Partial<Extension> & { id: string }>) => void;
}

export const useExtensionStore = create<ExtensionState>()(
  subscribeWithSelector((set, get) => ({
    extensions: [],
    extensionMap: new Map(),
    pendingSelection: null,

    add: async (url) => {
      const { show } = useNotificationStore.getState();
      const repoInfo = parseGitHubUrl(url);
      if (!repoInfo) {
        show('Invalid GitHub URL. Use `owner/repo`, `owner/repo@branch`, or a full GitHub URL.', 'error', 'Add Extension Error');
        return;
      }
      const { extensionMap, refresh } = get();
      const id = `${repoInfo.owner}/${repoInfo.repo}@${repoInfo.ref}`;
      const existing = extensionMap.get(id);

      if (existing && isCacheValid(existing.fetchedAt)) {
        show('This extension is already installed and up-to-date.', 'info', 'Add Extension');
        return;
      }

      await refresh(id);
    },

    cancelPendingInstall: () => {
      const { setExtensions, extensions, pendingSelection, setPendingSelection } = get();
      if (!pendingSelection) {
        return;
      }
      const { id } = pendingSelection;
      const extension = extensions.find((ext) => ext.id === id);

      if (extension) {
        const displayName = extension.name || id;
        logger.info(`Installation cancelled for extension '${displayName}'. Removing from store.`);
        const newExtensions = extensions.filter((ext) => ext.id !== id);
        setExtensions(newExtensions);
      } else {
        logger.warn(`Attempted to cancel non-existent pending extension with id: ${id}`);
      }

      setPendingSelection(null);
    },

    init: async () => {
      const rawExtensions = storage.get<Array<unknown>>(STORAGE_EXTENSIONS, 'Extensions') || [];
      const validStoredExtensions: Array<StorableExtension> = [];
      let hadCorruption = false;

      for (const rawExt of rawExtensions) {
        const { success, output } = v.safeParse(StorableExtensionSchema, rawExt);
        if (success) {
          validStoredExtensions.push(output);
        } else {
          hadCorruption = true;
        }
      }

      if (hadCorruption) {
        logger.warn('Corrupted extension data in storage; performing partial recovery.');
      }

      const extensions: Array<Extension> = validStoredExtensions.map((e) => ({ ...e, status: 'loading' }));
      get().setExtensions(extensions);

      const loadPromises = extensions.map((ext) => {
        if (isCacheValid(ext.fetchedAt)) {
          return loadAndExecuteExtension(ext, {
            getExtensionMap: () => get().extensionMap,
            setExtensionStatus: get().setExtensionStatus,
            setIngredients: get().setIngredients,
            upsert: get().upsert,
          });
        }
        return get().refresh(ext.id);
      });

      await Promise.all(loadPromises.map((p) => p.catch((err) => logger.error('Error during extension init:', err))));
    },

    installSelectedModules: async (id, selectedModules) => {
      const { setExtensionStatus, setIngredients, upsert } = get();
      const extension = get().extensionMap.get(id);
      if (!extension) {
        logger.error(`Attempted to install modules for a non-existent extension: ${id}`);
        return;
      }

      if (extension.ingredients) {
        ingredientRegistry.unregisterIngredients(extension.ingredients);
        setIngredients(id, []);
      }

      const updatedExtension: Extension = { ...extension, entry: selectedModules };
      upsert(updatedExtension);

      await loadAndExecuteExtension(updatedExtension, {
        getExtensionMap: () => get().extensionMap,
        setExtensionStatus,
        setIngredients,
        upsert,
      });
    },

    refresh: async (id) => {
      const { upsert, setIngredients, setExtensionStatus, setPendingSelection, extensionMap } = get();
      const storeExtension = extensionMap.get(id);

      logger.info(`Refreshing extension: ${storeExtension?.name || id}`);
      upsert({
        id,
        status: 'loading',
        name: storeExtension?.name || 'Refreshing...',
      });

      const repoInfo = parseGitHubUrl(id);
      if (!repoInfo) {
        setExtensionStatus(id, 'error', ['Invalid GitHub URL format.']);
        return;
      }

      try {
        const response = await fetch(`https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/${repoInfo.ref}/manifest.json`);
        if (!response.ok) {
          throw new Error(`Could not fetch manifest: ${response.statusText}`);
        }
        const manifestJson: unknown = await response.json();

        const validationResult = v.safeParse(ExtensionManifestSchema, manifestJson);
        if (!validationResult.success) {
          throw new Error(`Invalid manifest file: ${validationResult.issues[0].message}`);
        }
        const manifest: ExtensionManifest = validationResult.output;

        if (Array.isArray(manifest.entry) && typeof manifest.entry[0] === 'object') {
          upsert({ id, ...manifest, status: 'loading', scripts: {} });
          setPendingSelection({ id, manifest });
        } else {
          if (storeExtension?.ingredients) {
            ingredientRegistry.unregisterIngredients(storeExtension.ingredients);
            setIngredients(id, []);
          }

          const freshExtension: Extension = { id, ...manifest, status: 'loading', scripts: {} };
          upsert(freshExtension);
          await loadAndExecuteExtension(freshExtension, {
            getExtensionMap: () => get().extensionMap,
            setExtensionStatus: get().setExtensionStatus,
            setIngredients: get().setIngredients,
            upsert: get().upsert,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setExtensionStatus(id, 'error', [errorMessage]);
        logger.error(`Error refreshing extension ${id}:`, error);
      }
    },

    remove: (id) => {
      const { show } = useNotificationStore.getState();
      const { extensionMap, setExtensions } = get();
      const extension = extensionMap.get(id);
      if (!extension) {
        logger.warn(`Attempted to remove non-existent extension with id: ${id}`);
        return;
      }

      const displayName = extension.name || id;
      const ingredientsToRemove = extension.ingredients || [];

      if (ingredientsToRemove.length > 0) {
        const ingredientsToRemoveSet = new Set(ingredientsToRemove);
        ingredientRegistry.unregisterIngredients(ingredientsToRemove);

        const { ingredients: recipe, setRecipe, activeRecipeId } = useRecipeStore.getState();
        const updatedRecipe = recipe.filter((ing) => !ingredientsToRemoveSet.has(ing.name));
        if (updatedRecipe.length < recipe.length) {
          show(`${recipe.length - updatedRecipe.length} ingredient(s) from '${displayName}' removed from your recipe.`, 'info');
          setRecipe(updatedRecipe, activeRecipeId);
        }

        const { favorites, setFavorites } = useFavoriteStore.getState();
        const newFavorites = new Set(favorites);
        let favoritesChanged = false;
        for (const ingId of ingredientsToRemove) {
          if (newFavorites.delete(ingId)) {
            favoritesChanged = true;
          }
        }
        if (favoritesChanged) {
          setFavorites(newFavorites);
        }
      }

      const currentExtensions = get().extensions;
      const indexToRemove = currentExtensions.findIndex((ext) => ext.id === id);
      if (indexToRemove !== -1) {
        const newExtensions = [...currentExtensions];
        newExtensions.splice(indexToRemove, 1);
        setExtensions(newExtensions);
      }

      show(`Extension '${displayName}' has been successfully uninstalled.`, 'success', 'Extension Manager');
    },

    setExtensionStatus: (id, status, errors) => {
      const { extensions, extensionMap, setExtensions } = get();
      if (!extensionMap.has(id)) {
        return;
      }
      const updates: Partial<Extension> = {
        status,
        errors,
        ...((status === 'loaded' || status === 'partial') && { fetchedAt: Date.now() }),
      };
      const newExtensions = extensions.map((ext) => (ext.id === id ? { ...ext, ...updates } : ext));
      setExtensions(newExtensions);
    },

    setExtensions: (extensions) => {
      set(updateStateWithExtensions(extensions));
    },

    setIngredients: (id, ingredients) => {
      const { extensions, extensionMap, setExtensions } = get();
      if (!extensionMap.has(id)) {
        return;
      }
      const newExtensions = extensions.map((ext) => (ext.id === id ? { ...ext, ingredients } : ext));
      setExtensions(newExtensions);
    },

    setPendingSelection: (pending) => {
      if (pending) {
        useSettingStore.getState().pauseModal();
      } else if (get().pendingSelection) {
        useSettingStore.getState().resumeModal();
      }
      set({ pendingSelection: pending });
    },

    upsert: (extension) => {
      const { extensions, extensionMap, setExtensions } = get();
      const newExtensions = extensionMap.has(extension.id)
        ? extensions.map((e) => (e.id === extension.id ? ({ ...e, ...extension } as Extension) : e))
        : [...extensions, extension as Extension];
      setExtensions(newExtensions);
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
      .map(({ id, name, fetchedAt, scripts, entry }) => ({
        id,
        name,
        fetchedAt,
        scripts: { ...scripts },
        entry,
      }));
    storage.set(STORAGE_EXTENSIONS, storable, 'Extensions');
  },
);
