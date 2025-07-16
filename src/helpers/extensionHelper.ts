import { STORAGE_EXTENSIONS } from '../app/constants';
import { ingredientRegistry, logger, storage } from '../app/container';
import { useExtensionStore } from '../stores/useExtensionStore';
import { useFavoriteStore } from '../stores/useFavoriteStore';
import { useRecipeStore } from '../stores/useRecipeStore';
import { isObjectLike } from '../utilities/appUtil';
import { showNotification } from './notificationHelper';

import type { IngredientDefinition } from '../core/IngredientRegistry';
import type { Extension, ExtensionManifest, StorableExtension } from '../stores/useExtensionStore';

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const trimmedUrl = url.trim();
  const githubUrlMatch = trimmedUrl.match(/^(?:https?:\/\/)?github\.com\/([^/]+)\/([^/.]+)/);
  if (githubUrlMatch) {
    return { owner: githubUrlMatch[1], repo: githubUrlMatch[2].replace('.git', '') };
  }
  const simplePathMatch = trimmedUrl.match(/^([^/.]+)\/([^/.]+)/);
  if (simplePathMatch) {
    return { owner: simplePathMatch[1], repo: simplePathMatch[2].replace('.git', '') };
  }
  return null;
}

function isValidEntry(entry: unknown): entry is string | readonly string[] {
  return (
    (typeof entry === 'string' && !!entry.trim()) ||
    (Array.isArray(entry) && entry.length > 0 && entry.every((item) => typeof item === 'string' && !!item.trim()))
  );
}

function isStorableExtension(obj: unknown): obj is StorableExtension {
  if (!isObjectLike(obj)) return false;
  const { id, url, name, entry } = obj as Record<string, unknown>;
  return (
    typeof id === 'string' &&
    !!id.trim() &&
    typeof url === 'string' &&
    !!url.trim() &&
    typeof name === 'string' &&
    !!name.trim() &&
    isValidEntry(entry)
  );
}

function isExtensionManifest(obj: unknown): obj is ExtensionManifest {
  if (!isObjectLike(obj)) return false;
  const { name, entry } = obj as Record<string, unknown>;
  return typeof name === 'string' && !!name.trim() && isValidEntry(entry);
}

async function fetchAndExecuteScript(scriptUrl: string): Promise<void> {
  const response = await fetch(scriptUrl);
  if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
  const scriptContent = await response.text();
  try {
    new Function('Baratie', scriptContent)(window.Baratie);
  } catch (error) {
    throw new Error(`Execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function loadAndExecuteExtension(extension: Extension): Promise<void> {
  const { id, url, name, entry } = extension;
  const { setExtensionStatus, setIngredients } = useExtensionStore.getState();
  const repoInfo = parseGitHubUrl(url);
  if (!repoInfo) {
    setExtensionStatus(id, 'error', ['Invalid GitHub URL']);
    return;
  }
  const originalRegister = ingredientRegistry.registerIngredient.bind(ingredientRegistry);
  const newlyRegisteredSymbols: symbol[] = [];
  const entryPoints = Array.isArray(entry) ? entry : [entry];
  const errorLogs: string[] = [];
  let successCount = 0;
  try {
    ingredientRegistry.registerIngredient = <T>(definition: IngredientDefinition<T>) => {
      originalRegister({ ...definition, extensionId: id });
      newlyRegisteredSymbols.push(definition.name);
    };
    for (const entryPoint of entryPoints) {
      if (!entryPoint.trim()) continue;
      const scriptUrl = `https://cdn.jsdelivr.net/gh/${repoInfo.owner}/${repoInfo.repo}@latest/${entryPoint}`;
      try {
        await fetchAndExecuteScript(scriptUrl);
        successCount++;
      } catch (error) {
        errorLogs.push(`Error in '${entryPoint}': ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    ingredientRegistry.registerIngredient = originalRegister;
  }
  if (newlyRegisteredSymbols.length > 0) setIngredients(id, newlyRegisteredSymbols);
  const finalStatus: Extension['status'] = successCount > 0 ? (errorLogs.length > 0 ? 'partial' : 'loaded') : 'error';
  setExtensionStatus(id, finalStatus, errorLogs);
  if (finalStatus === 'loaded') logger.info(`Extension '${name}' loaded successfully with ${newlyRegisteredSymbols.length} ingredient(s).`);
  else if (finalStatus === 'partial') logger.warn(`Extension '${name}' partially loaded with ${errorLogs.length} error(s).`, errorLogs);
  else logger.error(`Extension '${name}' failed to load with ${errorLogs.length} error(s).`, errorLogs);
}

export async function initExtensions(): Promise<void> {
  const rawExtensions = storage.get<StorableExtension[]>(STORAGE_EXTENSIONS, 'Extensions');
  const extensions: Extension[] = Array.isArray(rawExtensions)
    ? rawExtensions.filter(isStorableExtension).map((e) => ({ ...e, status: 'loading' }))
    : [];
  useExtensionStore.getState().setExtensions(extensions);
  await Promise.all(
    extensions.map((ext) => loadAndExecuteExtension(ext).catch((err) => logger.error(`Error loading extension on init: ${ext.name}`, err))),
  );
}

export async function addExtension(url: string): Promise<void> {
  const repoInfo = parseGitHubUrl(url);
  if (!repoInfo) {
    showNotification('Invalid GitHub repository URL.', 'error', 'Add Extension Error');
    return;
  }
  const { extensions, add: storeAdd, setExtensionStatus } = useExtensionStore.getState();
  const id = `${repoInfo.owner}/${repoInfo.repo}`;
  if (extensions.some((ext) => ext.id === id)) {
    showNotification('This extension is already installed.', 'warning', 'Add Extension');
    return;
  }
  const manifestUrl = `https://cdn.jsdelivr.net/gh/${repoInfo.owner}/${repoInfo.repo}@latest/manifest.json`;
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Could not fetch manifest: ${response.statusText}`);
    const manifest: unknown = await response.json();
    if (!isExtensionManifest(manifest)) throw new Error('Manifest must contain a "name" and a non-empty "entry".');
    const newExtension: Extension = { id, url, name: manifest.name, entry: manifest.entry, status: 'loading' };
    storeAdd(newExtension);
    await loadAndExecuteExtension(newExtension);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    showNotification(`Failed to add extension: ${errorMessage}`, 'error', 'Add Extension Error');
    logger.error(`Error adding extension from URL ${url}:`, error);
    if (useExtensionStore.getState().extensions.find((ext) => ext.id === id)) {
      setExtensionStatus(id, 'error', [errorMessage]);
    }
  }
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
    if (updatedFavorites.length < favorites.length) setFavorites(updatedFavorites);
  }
  storeRemove(id);
  showNotification(`Extension '${extension.name}' has been successfully uninstalled.`, 'success', 'Extension Manager');
}
