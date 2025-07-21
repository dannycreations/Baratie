import * as v from 'valibot';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_EXTENSIONS } from '../app/constants';
import { ingredientRegistry, logger, storage } from '../app/container';
import { useFavoriteStore } from './useFavoriteStore';
import { useNotificationStore } from './useNotificationStore';
import { useRecipeStore } from './useRecipeStore';

import type { IngredientDefinition } from '../core/IngredientRegistry';

const NonEmptyString = v.pipe(v.string(), v.nonEmpty());

const ExtensionManifestSchema = v.object({
  name: NonEmptyString,
  entry: v.union([NonEmptyString, v.pipe(v.array(NonEmptyString), v.nonEmpty())]),
});

export type ExtensionManifest = v.InferInput<typeof ExtensionManifestSchema>;

const StorableExtensionSchema = v.object({
  id: NonEmptyString,
  name: NonEmptyString,
  fetchedAt: v.number(),
  scripts: v.record(v.string(), v.pipe(v.string(), v.nonEmpty())),
});

export type StorableExtension = v.InferInput<typeof StorableExtensionSchema>;

const EXTENSION_CACHE_MS = 86_400_000;

async function fetchProvider(repoInfo: { readonly owner: string; readonly repo: string; readonly ref: string }, path: string): Promise<Response> {
  const primaryUrl = `https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/${repoInfo.ref}/${path}`;
  const fallbackUrl = `https://cdn.jsdelivr.net/gh/${repoInfo.owner}/${repoInfo.repo}@${repoInfo.ref}/${path}`;

  try {
    logger.debug(`Fetching from primary provider: ${primaryUrl}`);
    const response = await fetch(primaryUrl);
    if (response.ok) {
      return response;
    }
    logger.warn(`Primary provider fetch failed with status ${response.status}. Trying mirror.`);
  } catch (error) {
    logger.warn('Primary provider fetch failed with an error. Trying mirror.', error);
  }

  logger.debug(`Fetching from mirror provider: ${fallbackUrl}`);
  return fetch(fallbackUrl);
}

function executeScript(scriptContent: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('Baratie', scriptContent)(window.Baratie);
  } catch (error) {
    throw new Error(`Execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function isCacheValid(fetchedAt?: number): boolean {
  if (typeof fetchedAt !== 'number') {
    return false;
  }
  return Date.now() - fetchedAt < EXTENSION_CACHE_MS;
}

function parseGitHubUrl(url: string): { readonly owner: string; readonly repo: string; readonly ref: string } | null {
  const trimmedUrl = url.trim();

  try {
    const urlObj = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://github.com/${trimmedUrl}`);
    if (urlObj.hostname === 'github.com') {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        const [owner, repo] = pathParts;
        const cleanRepo = repo.endsWith('.git') ? repo.slice(0, -4) : repo;
        let ref = 'latest';

        if (pathParts[2] === 'tree' && pathParts[3]) {
          ref = pathParts[3];
        } else {
          const atMatch = urlObj.pathname.match(/@([\w.-]+)$/);
          if (atMatch) {
            ref = atMatch[1];
          }
        }
        return { owner, repo: cleanRepo, ref };
      }
    }
  } catch {}

  const shorthandMatch = trimmedUrl.match(/^([\w.-]+)\/([\w.-]+)(?:[@#]([\w.-]+))?$/);
  if (shorthandMatch) {
    if (shorthandMatch[1].includes('.')) {
      return null;
    }
    return { owner: shorthandMatch[1], repo: shorthandMatch[2], ref: shorthandMatch[3] || 'latest' };
  }

  return null;
}

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
  readonly init: () => Promise<void>;
  readonly remove: (id: string) => void;
  readonly setExtensionStatus: (id: string, status: Extension['status'], errors?: readonly string[]) => void;
  readonly setExtensions: (extensions: readonly Extension[]) => void;
  readonly setIngredients: (id: string, ingredients: readonly symbol[]) => void;
  readonly upsert: (extension: Readonly<Partial<Extension> & { id: string }>) => void;
  readonly add: (url: string) => Promise<void>;
  readonly refresh: (id: string) => Promise<void>;
}

const updateStateWithExtensions = (extensions: readonly Extension[]) => {
  return {
    extensions,
    extensionMap: new Map(extensions.map((ext) => [ext.id, ext])),
  };
};

async function loadAndExecuteExtension(extension: Readonly<Extension>): Promise<void> {
  const { id, name, entry, scripts: cachedScripts } = extension;
  const { setExtensionStatus, setIngredients, upsert } = useExtensionStore.getState();

  const repoInfo = parseGitHubUrl(id);
  if (!repoInfo) {
    setExtensionStatus(id, 'error', ['Invalid GitHub URL format.']);
    return;
  }
  const entryPoints = Array.isArray(entry) ? entry : entry ? [entry] : Object.keys(cachedScripts || {});

  if (entryPoints.length === 0) {
    setExtensionStatus(id, 'error', ['Extension is missing entry point(s) in its manifest or cache.']);
    return;
  }

  const originalRegister = ingredientRegistry.registerIngredient.bind(ingredientRegistry);
  const newlyRegisteredSymbols: symbol[] = [];
  const errorLogs: string[] = [];
  const fetchedScripts: Record<string, string> = {};
  let successCount = 0;

  try {
    ingredientRegistry.registerIngredient = <T>(definition: IngredientDefinition<T>) => {
      originalRegister({ ...definition, extensionId: id });
      newlyRegisteredSymbols.push(definition.name);
    };

    for (const entryPoint of entryPoints) {
      if (!entryPoint.trim()) continue;
      try {
        let scriptContent = cachedScripts?.[entryPoint];
        if (!scriptContent) {
          logger.debug(`Cache miss for script: ${entryPoint}`);
          const response = await fetchProvider(repoInfo, entryPoint);
          if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
          scriptContent = await response.text();
          fetchedScripts[entryPoint] = scriptContent;
        } else {
          logger.debug(`Cache hit for script: ${entryPoint}`);
        }
        executeScript(scriptContent);
        successCount++;
      } catch (error) {
        errorLogs.push(`Error in '${entryPoint}': ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    ingredientRegistry.registerIngredient = originalRegister;
  }

  if (Object.keys(fetchedScripts).length > 0) {
    upsert({ id, scripts: { ...cachedScripts, ...fetchedScripts } });
  }

  if (newlyRegisteredSymbols.length > 0) setIngredients(id, newlyRegisteredSymbols);
  const finalStatus: Extension['status'] = successCount > 0 ? (errorLogs.length > 0 ? 'partial' : 'loaded') : 'error';
  setExtensionStatus(id, finalStatus, errorLogs);

  const displayName = name || id;
  if (finalStatus === 'loaded') {
    logger.info(`Extension '${displayName}' loaded successfully with ${newlyRegisteredSymbols.length} ingredient(s).`);
  } else if (finalStatus === 'partial') {
    logger.warn(`Extension '${displayName}' partially loaded with ${errorLogs.length} error(s).`, errorLogs);
  } else {
    logger.error(`Extension '${displayName}' failed to load with ${errorLogs.length} error(s).`, errorLogs);
  }
}

export const useExtensionStore = create<ExtensionState>()(
  subscribeWithSelector((set, get) => ({
    extensions: [],
    extensionMap: new Map(),

    init: async () => {
      const rawExtensions = storage.get<unknown[]>(STORAGE_EXTENSIONS, 'Extensions');

      const validationResult = v.safeParse(v.array(StorableExtensionSchema), rawExtensions);
      let validStoredExtensions: StorableExtension[];

      if (!validationResult.success) {
        logger.warn('Corrupted extension data in storage, attempting partial recovery.', { issues: validationResult.issues });
        validStoredExtensions = (rawExtensions || []).filter((e) => v.safeParse(StorableExtensionSchema, e).success) as StorableExtension[];
      } else {
        validStoredExtensions = validationResult.output;
      }

      const extensions: Extension[] = validStoredExtensions.map((e) => ({ ...e, status: 'loading' }));
      get().setExtensions(extensions);

      const loadPromises = extensions.map((ext) => {
        if (isCacheValid(ext.fetchedAt)) {
          return loadAndExecuteExtension(ext);
        }
        return get().refresh(ext.id);
      });

      await Promise.all(loadPromises.map((p) => p.catch((err) => logger.error('Error during extension init:', err))));
    },

    remove: (id) => {
      const { show } = useNotificationStore.getState();
      const extension = get().extensionMap.get(id);
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
        const updatedFavorites = new Set([...favorites].filter((fav) => !ingredientsToRemoveSet.has(fav)));
        if (updatedFavorites.size < favorites.size) {
          setFavorites(updatedFavorites);
        }
      }
      set((state) => updateStateWithExtensions(state.extensions.filter((ext) => ext.id !== id)));
      show(`Extension '${displayName}' has been successfully uninstalled.`, 'success', 'Extension Manager');
    },

    setExtensions: (extensions) => {
      set(updateStateWithExtensions(extensions));
    },

    setExtensionStatus: (id, status, errors) => {
      set((state) => {
        const index = state.extensions.findIndex((ext) => ext.id === id);
        if (index === -1) return {};
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

    setIngredients: (id, ingredients) => {
      set((state) => {
        const index = state.extensions.findIndex((ext) => ext.id === id);
        if (index === -1) return {};
        const newExtensions = [...state.extensions];
        newExtensions[index] = { ...newExtensions[index], ingredients };
        return updateStateWithExtensions(newExtensions);
      });
    },

    upsert: (extension) => {
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

    refresh: async (id) => {
      const { upsert, setIngredients, setExtensionStatus, extensionMap } = get();
      const storeExtension = extensionMap.get(id);

      logger.info(`Refreshing extension: ${storeExtension?.name || id}`);
      upsert({ id, status: 'loading', name: storeExtension?.name || 'Refreshing...', scripts: {} });

      const repoInfo = parseGitHubUrl(id);
      if (!repoInfo) {
        setExtensionStatus(id, 'error', ['Invalid GitHub URL format.']);
        return;
      }

      try {
        const response = await fetchProvider(repoInfo, 'manifest.json');
        if (!response.ok) throw new Error(`Could not fetch manifest: ${response.statusText}`);
        const manifestJson: unknown = await response.json();

        const validationResult = v.safeParse(ExtensionManifestSchema, manifestJson);
        if (!validationResult.success) {
          throw new Error(`Invalid manifest file: ${validationResult.issues[0].message}`);
        }
        const manifest = validationResult.output;

        if (storeExtension?.ingredients) {
          ingredientRegistry.unregisterIngredients(storeExtension.ingredients);
          setIngredients(id, []);
        }

        const freshExtension: Extension = { id, ...manifest, status: 'loading', scripts: {} };
        upsert(freshExtension);
        await loadAndExecuteExtension(freshExtension);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setExtensionStatus(id, 'error', [errorMessage]);
        logger.error(`Error refreshing extension ${id}:`, error);
      }
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
