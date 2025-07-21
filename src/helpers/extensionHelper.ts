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

async function refreshExtension(id: string): Promise<void> {
  const { upsert, setIngredients, setExtensionStatus, extensionMap } = useExtensionStore.getState();
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
}

export async function addExtension(url: string): Promise<void> {
  const repoInfo = parseGitHubUrl(url);
  if (!repoInfo) {
    showNotification('Invalid GitHub URL. Use `owner/repo`, `owner/repo@branch`, or a full GitHub URL.', 'error', 'Add Extension Error');
    return;
  }
  const { extensionMap } = useExtensionStore.getState();
  const id = `${repoInfo.owner}/${repoInfo.repo}@${repoInfo.ref}`;
  const existing = extensionMap.get(id);

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
  const { extensionMap, remove: storeRemove } = useExtensionStore.getState();
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
      showNotification(`${recipe.length - updatedRecipe.length} ingredient(s) from '${displayName}' removed from your recipe.`, 'info');
      setRecipe(updatedRecipe, activeRecipeId);
    }

    const { favorites, setFavorites } = useFavoriteStore.getState();
    const updatedFavorites = new Set([...favorites].filter((fav) => !ingredientsToRemoveSet.has(fav)));
    if (updatedFavorites.size < favorites.size) {
      setFavorites(updatedFavorites);
    }
  }
  storeRemove(id);
  showNotification(`Extension '${displayName}' has been successfully uninstalled.`, 'success', 'Extension Manager');
}
