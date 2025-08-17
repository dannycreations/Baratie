import { safeParse } from 'valibot';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_EXTENSIONS } from '../app/constants';
import { ingredientRegistry, logger, storage } from '../app/container';
import {
  ExtensionManifestSchema,
  isCacheValid,
  loadAndExecuteExtension,
  parseGitHubUrl,
  StorableExtensionSchema,
  updateStateWithExtensions,
} from '../helpers/extensionHelper';
import { isObjectLike } from '../utilities/objectUtil';
import { useFavoriteStore } from './useFavoriteStore';
import { useNotificationStore } from './useNotificationStore';
import { useRecipeStore } from './useRecipeStore';

import type { Extension, ExtensionManifest, ManifestModule } from '../helpers/extensionHelper';

export interface ExtensionState {
  readonly extensions: ReadonlyArray<Extension>;
  readonly extensionMap: ReadonlyMap<string, Extension>;
  readonly add: (url: string, options?: Readonly<{ force?: boolean }>) => Promise<void>;
  readonly cancelPendingInstall: () => void;
  readonly init: () => Promise<void>;
  readonly installSelectedModules: (id: string, selectedModules: ReadonlyArray<ManifestModule>) => Promise<void>;
  readonly refresh: (
    id: string,
    options?: Readonly<{
      force?: boolean;
      context?: 'add' | 'refresh';
    }>,
  ) => Promise<void>;
  readonly remove: (id: string) => void;
  readonly setExtensionStatus: (id: string, status: Extension['status'], errors?: ReadonlyArray<string>) => void;
  readonly setExtensions: (extensions: ReadonlyArray<Extension>) => void;
  readonly setIngredients: (id: string, ingredients: ReadonlyArray<string>) => void;
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

    add: async (url, options) => {
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

      await refresh(id, { ...options, context: 'add' });
    },

    cancelPendingInstall: () => {
      const { setExtensions, extensions } = get();
      const pendingExtension = extensions.find((e) => e.status === 'awaiting');

      if (pendingExtension) {
        const displayName = pendingExtension.name || pendingExtension.id;
        logger.info(`Installation cancelled for extension '${displayName}'. Removing from store.`);
        const newExtensions = extensions.filter((ext) => ext.id !== pendingExtension.id);
        setExtensions(newExtensions);
      } else {
        logger.warn(`Attempted to cancel non-existent pending extension.`);
      }
    },

    init: async () => {
      const rawExtensions = storage.get<Array<unknown>>(STORAGE_EXTENSIONS, 'Extensions') || [];
      const extensions: Array<Extension> = [];
      let hadCorruption = false;

      for (const rawExt of rawExtensions) {
        const { success, output } = safeParse(StorableExtensionSchema, rawExt);
        if (success) {
          extensions.push({ ...output, status: 'loading' });
        } else {
          hadCorruption = true;
          if (isObjectLike(rawExt) && typeof rawExt?.id === 'string') {
            const id = rawExt.id;
            const name = typeof rawExt.name === 'string' ? rawExt.name : id;
            extensions.push({
              id: id,
              name: name,
              status: 'error',
              errors: ['Corrupted data in storage. Please refresh the extension.'],
            });
          }
        }
      }

      if (hadCorruption) {
        logger.warn('Corrupted extension data in storage; some extensions may be marked as errored.');
      }

      get().setExtensions(extensions);

      const loadPromises = extensions.map((ext) => {
        if (ext.status === 'error') {
          return Promise.resolve();
        }

        if (isCacheValid(ext.fetchedAt)) {
          return loadAndExecuteExtension(ext, {
            getExtensionMap: () => get().extensionMap,
            setExtensionStatus: get().setExtensionStatus,
            setIngredients: get().setIngredients,
            upsert: get().upsert,
          });
        }
        return get().refresh(ext.id, { force: true });
      });

      await Promise.all(
        loadPromises.map((p) => {
          return p.catch((err) => {
            logger.error('Error during extension init:', err);
          });
        }),
      );
    },

    installSelectedModules: async (id, selectedModules) => {
      const { setExtensionStatus, setIngredients, upsert, extensionMap } = get();
      const extension = extensionMap.get(id);

      if (!extension) {
        logger.error(`Attempted to install modules for a non-existent extension: ${id}`);
        return;
      }

      if (extension.ingredients) {
        ingredientRegistry.unregister(extension.ingredients);
        setIngredients(id, []);
      }

      const updatedExtension: Extension = { ...extension, status: 'loading', entry: [...selectedModules] };
      upsert(updatedExtension);

      await loadAndExecuteExtension(updatedExtension, {
        getExtensionMap: () => get().extensionMap,
        setExtensionStatus: setExtensionStatus,
        setIngredients: setIngredients,
        upsert: upsert,
      });
    },

    refresh: async (id, options) => {
      const { upsert, setIngredients, setExtensionStatus, extensionMap } = get();
      const storeExtension = extensionMap.get(id);
      const context = options?.context;

      let displayName = storeExtension?.name;
      const isNew = !storeExtension;

      if (context === 'refresh') {
        displayName = 'Refreshing...';
      } else if (isNew) {
        displayName = 'Fetching...';
      } else if (context === 'add' && storeExtension) {
        displayName = 'Refreshing...';
      }

      if (!displayName) {
        displayName = id;
      }

      const logMessage = context === 'refresh' || (context === 'add' && storeExtension) ? 'Refreshing' : 'Fetching';
      logger.info(`${logMessage} extension: ${storeExtension?.name || id}`);

      upsert({
        id: id,
        status: 'loading',
        name: displayName,
      });

      const repoInfo = parseGitHubUrl(id);
      if (!repoInfo) {
        setExtensionStatus(id, 'error', ['Invalid GitHub URL format.']);
        upsert({ id: id, name: storeExtension?.name || 'Error' });
        return;
      }

      try {
        const response = await fetch(`https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/${repoInfo.ref}/manifest.json`);
        if (!response.ok) {
          throw new Error('Could not fetch manifest');
        }
        const manifestJson: unknown = await response.json();

        const validationResult = safeParse(ExtensionManifestSchema, manifestJson);
        if (!validationResult.success) {
          throw new Error(`Invalid manifest file: ${validationResult.issues[0].message}`);
        }
        const manifest: ExtensionManifest = validationResult.output;
        upsert({ id, manifest });

        const isModuleBased = Array.isArray(manifest.entry) && typeof manifest.entry[0] === 'object';
        if (isModuleBased && !(options?.force ?? false)) {
          upsert({ id: id, name: manifest.name, status: 'awaiting', manifest: manifest });
        } else {
          if (storeExtension?.ingredients) {
            ingredientRegistry.unregister(storeExtension.ingredients);
            setIngredients(id, []);
          }

          const entryToUse = isModuleBased && storeExtension?.entry ? storeExtension.entry : manifest.entry;
          upsert({ id: id, entry: entryToUse, scripts: {} });
          const currentExtState = get().extensionMap.get(id)!;

          await loadAndExecuteExtension(currentExtState, {
            getExtensionMap: () => get().extensionMap,
            setExtensionStatus: get().setExtensionStatus,
            setIngredients: get().setIngredients,
            upsert: get().upsert,
          });

          const finalState = get().extensionMap.get(id)!;
          if (finalState.status === 'loaded' || finalState.status === 'partial') {
            upsert({ id, name: manifest.name });
          } else if (finalState.status === 'error') {
            upsert({ id, name: storeExtension?.name || 'Error' });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setExtensionStatus(id, 'error', [errorMessage]);
        upsert({ id: id, name: storeExtension?.name || 'Error' });
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
        ingredientRegistry.unregister(ingredientsToRemove);

        const { ingredients: recipe, setRecipe, activeRecipeId } = useRecipeStore.getState();
        const updatedRecipe = recipe.filter((ing) => !ingredientsToRemoveSet.has(ing.ingredientId));
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
      const extension = extensionMap.get(id);
      const updates: Partial<Extension> = {
        status: status,
        errors: errors,
        ...((status === 'loaded' || status === 'partial') && { fetchedAt: Date.now() }),
      };
      if (status === 'error' && extension?.name === 'Refreshing...') {
        updates.name = 'Error';
      }
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
      const newExtensions = extensions.map((ext) => (ext.id === id ? { ...ext, ingredients: ingredients } : ext));
      setExtensions(newExtensions);
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

let lastExtensions = useExtensionStore.getState().extensions;

useExtensionStore.subscribe((state) => {
  const { extensions } = state;
  if (extensions !== lastExtensions) {
    const storable = extensions
      .filter(
        (ext) =>
          (ext.status === 'loaded' || ext.status === 'partial') &&
          !!ext.name &&
          typeof ext.fetchedAt === 'number' &&
          !!ext.scripts &&
          Object.keys(ext.scripts).length > 0,
      )
      .map(({ id, name, fetchedAt, scripts, entry }) => {
        return {
          id: id,
          name: name,
          fetchedAt: fetchedAt,
          scripts: { ...scripts },
          entry: entry,
        };
      });
    storage.set(STORAGE_EXTENSIONS, storable, 'Extensions');
    lastExtensions = extensions;
  }
});
