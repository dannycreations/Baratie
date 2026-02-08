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
  shallowExtensionStorable,
  StorableExtensionSchema,
} from '../helpers/extensionHelper';
import { isObjectLike, pick } from '../utilities/objectUtil';
import { createMapHandlers } from '../utilities/storeUtil';
import { useNotificationStore } from './useNotificationStore';

import type { Extension, ExtensionManifest, ManifestModule, StorableExtension } from '../helpers/extensionHelper';

export interface ExtensionState {
  readonly extensions: ReadonlyArray<Extension>;
  readonly extensionMap: ReadonlyMap<string, Extension>;
  readonly add: (url: string, options?: Readonly<{ force?: boolean; onProgress?: (percentage: number) => void }>) => Promise<void>;
  readonly cancelPendingInstall: () => void;
  readonly init: () => Promise<void>;
  readonly installSelectedModules: (id: string, selectedModules: ReadonlyArray<ManifestModule>) => Promise<void>;
  readonly refresh: (
    id: string,
    options?: Readonly<{
      force?: boolean;
      context?: 'add' | 'refresh';
      onProgress?: (percentage: number) => void;
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

const fetchAndValidateManifest = async (repoInfo: {
  readonly owner: string;
  readonly repo: string;
  readonly ref: string;
}): Promise<ExtensionManifest> => {
  const repo = `${repoInfo.owner}/${repoInfo.repo}`;
  const targetUrl = `https://raw.githubusercontent.com/${repo}/${repoInfo.ref}/manifest.json?t=${Date.now()}`;
  const response = await fetch(targetUrl, { cache: 'reload' });
  if (!response.ok) {
    throw new Error('Could not fetch manifest');
  }

  const manifestJson: unknown = await response.json();
  const validationResult = safeParse(ExtensionManifestSchema, manifestJson);
  if (!validationResult.success) {
    throw new Error(`Invalid manifest file: ${validationResult.issues[0].message}`);
  }
  return validationResult.output;
};

export const useExtensionStore = create<ExtensionState>()(
  subscribeWithSelector((set, get) => {
    const handlers = createMapHandlers<ExtensionState, 'extensionMap', string, Extension>(set, 'extensionMap');

    const syncExtensions = (state: ExtensionState): Partial<ExtensionState> => ({
      extensions: [...state.extensionMap.values()],
    });

    return {
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
          setExtensions(extensions.filter((ext) => ext.id !== pendingExtension.id));
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

        await loadAndExecuteExtension(
          updatedExtension,
          {
            getExtensionMap: () => get().extensionMap,
            setExtensionStatus: setExtensionStatus,
            setIngredients: setIngredients,
            upsert: upsert,
          },
          undefined,
        );
      },

      refresh: async (id, options) => {
        const { upsert, setIngredients, setExtensionStatus, extensionMap } = get();
        const storeExtension = extensionMap.get(id);
        const context = options?.context;
        const isNew = !storeExtension;

        const logMessage = context === 'refresh' || (context === 'add' && !isNew) ? 'Refreshing' : 'Fetching';
        logger.info(`${logMessage} extension: ${storeExtension?.name || id}`);

        let displayName = storeExtension?.name || id;
        if (logMessage === 'Refreshing') {
          displayName = 'Refreshing...';
        } else if (isNew) {
          displayName = 'Fetching...';
        }

        upsert({ id, status: 'loading', name: displayName, fetchedAt: undefined });

        const repoInfo = parseGitHubUrl(id);
        if (!repoInfo) {
          setExtensionStatus(id, 'error', ['Invalid GitHub URL format.']);
          upsert({ id, name: storeExtension?.name || 'Error' });
          return;
        }

        try {
          const manifest = await fetchAndValidateManifest(repoInfo);

          if (storeExtension?.ingredients) {
            ingredientRegistry.unregister(storeExtension.ingredients);
            setIngredients(id, []);
          }

          const isModuleBased = Array.isArray(manifest.entry) && typeof manifest.entry[0] === 'object';
          if (isModuleBased && !options?.force) {
            upsert({ id, name: manifest.name, status: 'awaiting', manifest, scripts: {} });
          } else {
            const entryToUse = isModuleBased && storeExtension?.entry ? storeExtension.entry : manifest.entry;
            upsert({ id, manifest, entry: entryToUse, scripts: {} });
            const currentExtState = get().extensionMap.get(id)!;

            await loadAndExecuteExtension(
              currentExtState,
              {
                getExtensionMap: () => get().extensionMap,
                setExtensionStatus: get().setExtensionStatus,
                setIngredients: get().setIngredients,
                upsert: get().upsert,
              },
              options?.onProgress,
            );

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
          upsert({ id, name: storeExtension?.name || 'Error' });
          logger.error(`Error refreshing extension ${id}:`, error);
        }
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
          ingredientRegistry.unregister(ingredientsToRemove);
        }

        handlers.remove(id);
        set(syncExtensions);
        show(`Extension '${displayName}' has been successfully uninstalled.`, 'success', 'Extension Manager');
      },

      setExtensionStatus: (id, status, errors) => {
        const extension = get().extensionMap.get(id);
        if (!extension) {
          return;
        }
        const updates: Partial<Extension> = {
          status: status,
          errors: errors,
          ...((status === 'loaded' || status === 'partial') && { fetchedAt: Date.now() }),
        };
        if (status === 'error' && extension.name === 'Refreshing...') {
          updates.name = 'Error';
        }
        get().upsert({ ...updates, id });
      },

      setExtensions: (extensions) => {
        handlers.setAll(extensions.map((ext) => [ext.id, ext]));
        set(syncExtensions);
      },

      setIngredients: (id, ingredients) => {
        get().upsert({ id, ingredients });
      },

      upsert: (extension) => {
        handlers.upsert(extension.id, extension);
        set(syncExtensions);
      },
    };
  }),
);

useExtensionStore.subscribe(
  (state) =>
    state.extensions
      .filter(
        (ext) =>
          (ext.status === 'loaded' || ext.status === 'partial') &&
          !!ext.name &&
          typeof ext.fetchedAt === 'number' &&
          !!ext.scripts &&
          Object.keys(ext.scripts).length > 0,
      )
      .map((ext) => pick(ext, ['id', 'name', 'entry', 'scripts', 'fetchedAt']) as StorableExtension),
  (storable) => {
    storage.set(STORAGE_EXTENSIONS, storable, 'Extensions');
  },
  {
    equalityFn: shallowExtensionStorable,
  },
);
