import * as v from 'valibot';

import { STORAGE_EXTENSIONS } from '../app/constants';
import { ingredientRegistry, logger, storage } from '../app/container';
import { useExtensionStore } from '../stores/useExtensionStore';
import { useFavoriteStore } from '../stores/useFavoriteStore';
import { useRecipeStore } from '../stores/useRecipeStore';
import { showNotification } from './notificationHelper';

import type { IngredientDefinition } from '../core/IngredientRegistry';
import type { Extension } from '../stores/useExtensionStore';

const NonEmptyString = v.pipe(v.string(), v.nonEmpty());

const ExtensionManifestSchema = v.object({
  name: NonEmptyString,
  entry: v.union([NonEmptyString, v.pipe(v.array(NonEmptyString), v.nonEmpty())]),
});

export type ExtensionManifest = v.InferInput<typeof ExtensionManifestSchema>;

const StorableExtensionSchema = v.intersect([
  ExtensionManifestSchema,
  v.object({
    id: NonEmptyString,
    fetchedAt: v.number(),
    scripts: v.record(v.string(), v.string()),
  }),
]);

export type StorableExtension = v.InferInput<typeof StorableExtensionSchema>;

const EXTENSION_CACHE_MS = 86_400_000;

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

async function loadAndExecuteExtension(extension: Readonly<Extension>): Promise<void> {
  const { id, name, entry, scripts: cachedScripts } = extension;
  const { setExtensionStatus, setIngredients, upsert } = useExtensionStore.getState();

  const repoInfo = parseGitHubUrl(id);
  if (!repoInfo) {
    setExtensionStatus(id, 'error', ['Invalid GitHub URL format.']);
    return;
  }

  const originalRegister = ingredientRegistry.registerIngredient.bind(ingredientRegistry);
  const newlyRegisteredSymbols: symbol[] = [];
  const entryPoints = Array.isArray(entry) ? entry : [entry];
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
      const scriptUrl = `https://cdn.jsdelivr.net/gh/${repoInfo.owner}/${repoInfo.repo}@${repoInfo.ref}/${entryPoint}`;
      try {
        let scriptContent = cachedScripts?.[scriptUrl];
        if (!scriptContent) {
          logger.debug(`Cache miss for script: ${scriptUrl}`);
          const response = await fetch(scriptUrl);
          if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
          scriptContent = await response.text();
          fetchedScripts[scriptUrl] = scriptContent;
        } else {
          logger.debug(`Cache hit for script: ${scriptUrl}`);
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

  if (finalStatus === 'loaded') {
    logger.info(`Extension '${name}' loaded successfully with ${newlyRegisteredSymbols.length} ingredient(s).`);
  } else if (finalStatus === 'partial') {
    logger.warn(`Extension '${name}' partially loaded with ${errorLogs.length} error(s).`, errorLogs);
  } else {
    logger.error(`Extension '${name}' failed to load with ${errorLogs.length} error(s).`, errorLogs);
  }
}

function parseGitHubUrl(url: string): { readonly owner: string; readonly repo: string; readonly ref: string } | null {
  const trimmedUrl = url.trim();

  const fullUrlMatch = trimmedUrl.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/tree\/([\w.-]+))?\/?$/);
  if (fullUrlMatch) {
    return { owner: fullUrlMatch[1], repo: fullUrlMatch[2], ref: fullUrlMatch[3] || 'latest' };
  }

  const shorthandMatch = trimmedUrl.match(/^([\w.-]+)\/([\w.-]+)(?:[@#]([\w.-]+))?$/);
  if (shorthandMatch) {
    if (shorthandMatch[1].includes('.') || shorthandMatch[0].startsWith('http')) {
      return null;
    }
    return { owner: shorthandMatch[1], repo: shorthandMatch[2], ref: shorthandMatch[3] || 'latest' };
  }

  return null;
}

async function refreshExtension(id: string): Promise<void> {
  const { upsert, setIngredients, setExtensionStatus } = useExtensionStore.getState();
  const storeExtension = useExtensionStore.getState().extensions.find((e) => e.id === id);

  logger.info(`Refreshing extension: ${storeExtension?.name || id}`);
  upsert({ id, status: 'loading', name: storeExtension?.name || 'Refreshing...', scripts: {} });

  const repoInfo = parseGitHubUrl(id);
  if (!repoInfo) {
    setExtensionStatus(id, 'error', ['Invalid GitHub URL format.']);
    return;
  }
  const manifestUrl = `https://cdn.jsdelivr.net/gh/${repoInfo.owner}/${repoInfo.repo}@${repoInfo.ref}/manifest.json`;

  try {
    const response = await fetch(manifestUrl);
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
}

export async function addExtension(url: string): Promise<void> {
  const repoInfo = parseGitHubUrl(url);
  if (!repoInfo) {
    showNotification('Invalid GitHub URL. Use `owner/repo`, `owner/repo@branch`, or a full GitHub URL.', 'error', 'Add Extension Error');
    return;
  }
  const { extensions } = useExtensionStore.getState();
  const id = `${repoInfo.owner}/${repoInfo.repo}@${repoInfo.ref}`;
  const existing = extensions.find((ext) => ext.id === id);

  if (existing && isCacheValid(existing.fetchedAt)) {
    showNotification('This extension is already installed and up-to-date.', 'info', 'Add Extension');
    return;
  }

  await refreshExtension(id);
}

export async function initExtensions(): Promise<void> {
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

  useExtensionStore.getState().setExtensions(extensions);

  const loadPromises = extensions.map((ext) => {
    if (isCacheValid(ext.fetchedAt)) {
      return loadAndExecuteExtension(ext);
    }
    return refreshExtension(ext.id);
  });

  await Promise.all(loadPromises.map((p) => p.catch((err) => logger.error('Error during extension init:', err))));
}

export function removeExtension(id: string): void {
  const { extensions, remove: storeRemove } = useExtensionStore.getState();
  const extension = extensions.find((ext) => ext.id === id);
  if (!extension) {
    logger.warn(`Attempted to remove non-existent extension with id: ${id}`);
    return;
  }
  const ingredientsToRemove = extension.ingredients || [];
  if (ingredientsToRemove.length > 0) {
    ingredientRegistry.unregisterIngredients(ingredientsToRemove);
    const { ingredients: recipe, setRecipe, activeRecipeId } = useRecipeStore.getState();
    const updatedRecipe = recipe.filter((ing) => !ingredientsToRemove.includes(ing.name));
    if (updatedRecipe.length < recipe.length) {
      setRecipe(updatedRecipe, activeRecipeId);
      showNotification(`${recipe.length - updatedRecipe.length} ingredient(s) from '${extension.name}' removed from your recipe.`, 'info');
    }
    const { favorites, setFavorites } = useFavoriteStore.getState();
    const updatedFavorites = favorites.filter((fav) => !ingredientsToRemove.includes(fav));
    if (updatedFavorites.length < favorites.length) {
      setFavorites(updatedFavorites);
    }
  }
  storeRemove(id);
  showNotification(`Extension '${extension.name}' has been successfully uninstalled.`, 'success', 'Extension Manager');
}
