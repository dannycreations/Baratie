import { STORAGE_EXTENSIONS } from '../app/constants';
import { ingredientRegistry, logger, storage } from '../app/container';
import { useExtensionStore } from '../stores/useExtensionStore';
import { useFavoriteStore } from '../stores/useFavoriteStore';
import { useRecipeStore } from '../stores/useRecipeStore';
import { showNotification } from './notificationHelper';

import type { IngredientDefinition } from '../core/IngredientRegistry';
import type { Extension, ExtensionManifest } from '../stores/useExtensionStore';

type StorableExtension = Omit<Extension, 'status' | 'errors' | 'registeredIngredients'>;

function isExtensionManifest(obj: unknown): obj is ExtensionManifest {
  if (typeof obj !== 'object' || obj === null) return false;
  const manifest = obj as Record<string, unknown>;
  const { name, entry } = manifest;
  if (typeof name !== 'string' || !name) {
    return false;
  }
  if (typeof entry === 'string' && entry) {
    return true;
  }
  if (Array.isArray(entry) && entry.length > 0 && entry.every((item) => typeof item === 'string')) {
    return true;
  }
  return false;
}

function isStorableExtension(obj: unknown): obj is StorableExtension {
  if (typeof obj !== 'object' || obj === null) return false;
  const ext = obj as Record<string, unknown>;
  const { id, url, name, entry } = ext;

  if (typeof id !== 'string' || typeof url !== 'string' || typeof name !== 'string') {
    return false;
  }
  if (typeof entry === 'string') {
    return true;
  }
  if (Array.isArray(entry) && entry.every((item) => typeof item === 'string')) {
    return true;
  }
  return false;
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

  ingredientRegistry.registerIngredient = <T>(definition: IngredientDefinition<T>) => {
    const defWithExtensionId = { ...definition, extensionId: id };
    originalRegister(defWithExtensionId);
    newlyRegisteredSymbols.push(defWithExtensionId.name);
  };

  const entryPoints = Array.isArray(entry) ? entry : [entry];
  const successLogs: string[] = [];
  const errorLogs: string[] = [];

  for (const entryPoint of entryPoints) {
    if (!entryPoint.trim()) continue;
    const scriptUrl = `https://cdn.jsdelivr.net/gh/${repoInfo.owner}/${repoInfo.repo}@latest/${entryPoint}`;
    try {
      const response = await fetch(scriptUrl);
      if (!response.ok) {
        throw new Error(`Fetch failed for ${entryPoint}: ${response.statusText}`);
      }
      const scriptContent = await response.text();

      try {
        new Function('Baratie', scriptContent)(window.Baratie);
        successLogs.push(entryPoint);
      } catch (error) {
        const execError = error instanceof Error ? error.message : String(error);
        throw new Error(`Execution of ${entryPoint} failed: ${execError}`);
      }
    } catch (error) {
      const loadError = error instanceof Error ? error.message : String(error);
      errorLogs.push(loadError);
    }
  }

  ingredientRegistry.registerIngredient = originalRegister;

  if (newlyRegisteredSymbols.length > 0) {
    setIngredients(id, newlyRegisteredSymbols);
  }

  let finalStatus: Extension['status'] = 'error';
  if (successLogs.length > 0) {
    finalStatus = errorLogs.length > 0 ? 'partial' : 'loaded';
  }

  setExtensionStatus(id, finalStatus, errorLogs);

  if (finalStatus === 'loaded') {
    logger.info(`Extension '${name}' loaded successfully with ${newlyRegisteredSymbols.length} ingredient(s).`);
  } else if (finalStatus === 'partial') {
    logger.warn(`Extension '${name}' partially loaded with ${errorLogs.length} error(s).`, errorLogs);
  } else {
    logger.error(`Extension '${name}' failed to load with ${errorLogs.length} error(s).`, errorLogs);
  }
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const urlObject = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (urlObject.hostname !== 'github.com') {
      return null;
    }
    const pathParts = urlObject.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return { owner: pathParts[0], repo: pathParts[1].replace('.git', '') };
    }
  } catch {
    const parts = url.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] !== 'http:' && parts[0] !== 'https:') {
      return { owner: parts[0], repo: parts[1].replace('.git', '') };
    }
  }
  return null;
}

export async function initExtensions(): Promise<void> {
  const rawExtensions = storage.get(STORAGE_EXTENSIONS, 'Extensions');
  const extensions: Extension[] = [];

  if (Array.isArray(rawExtensions)) {
    for (const raw of rawExtensions) {
      if (isStorableExtension(raw)) {
        extensions.push({ ...raw, status: 'loading', errors: [], ingredients: [] });
      }
    }
  }

  useExtensionStore.getState().setExtensions(extensions);

  const loadingPromises = extensions.map((extension) =>
    loadAndExecuteExtension(extension).catch((error) => logger.error(`Error loading extension on init: ${extension.name}`, error)),
  );
  await Promise.all(loadingPromises);
}

export async function addExtension(url: string): Promise<void> {
  const repoInfo = parseGitHubUrl(url);
  if (!repoInfo) {
    showNotification('Invalid GitHub repository URL.', 'error', 'Add Extension Error');
    return;
  }

  const { addExtension, extensions, setExtensionStatus } = useExtensionStore.getState();
  const id = `${repoInfo.owner}/${repoInfo.repo}`;

  if (extensions.some((ext) => ext.id === id)) {
    showNotification('This extension is already installed.', 'warning', 'Add Extension');
    return;
  }

  const manifestUrl = `https://cdn.jsdelivr.net/gh/${repoInfo.owner}/${repoInfo.repo}@latest/manifest.json`;

  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`Could not fetch manifest: ${response.statusText}`);
    }
    const manifest = await response.json();

    if (!isExtensionManifest(manifest)) {
      throw new Error('Manifest must contain a "name" and a non-empty "entry" (string or array).');
    }

    const newExtension: Extension = {
      id,
      url,
      name: manifest.name,
      entry: manifest.entry,
      status: 'loading',
      errors: [],
      ingredients: [],
    };

    addExtension(newExtension);
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
  const extension = useExtensionStore.getState().extensions.find((ext) => ext.id === id);
  if (!extension) {
    logger.warn(`Attempted to remove non-existent extension with id: ${id}`);
    return;
  }

  const ingredientsToRemove = extension.ingredients || [];

  if (ingredientsToRemove.length > 0) {
    ingredientRegistry.unregisterIngredients(ingredientsToRemove);

    const { ingredients: currentRecipe, set: setRecipe } = useRecipeStore.getState();
    const updatedRecipe = currentRecipe.filter((ing) => !ingredientsToRemove.includes(ing.name));
    if (updatedRecipe.length < currentRecipe.length) {
      const activeRecipeId = useRecipeStore.getState().activeRecipeId;
      setRecipe(updatedRecipe, activeRecipeId);
      const removedCount = currentRecipe.length - updatedRecipe.length;
      showNotification(`${removedCount} ingredient(s) from '${extension.name}' removed from your current recipe.`, 'info', 'Extension Unloaded');
    }

    const { favorites, setFavorites } = useFavoriteStore.getState();
    const updatedFavorites = favorites.filter((fav) => !ingredientsToRemove.includes(fav));
    if (updatedFavorites.length < favorites.length) {
      setFavorites(updatedFavorites);
    }
  }

  useExtensionStore.getState().remove(id);
  showNotification(`Extension '${extension.name}' has been successfully uninstalled.`, 'success', 'Extension Manager');
}
