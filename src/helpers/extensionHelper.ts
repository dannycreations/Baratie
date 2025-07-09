import { STORAGE_EXTENSIONS } from '../app/constants';
import { logger, storage } from '../app/container';
import { useExtensionStore } from '../stores/useExtensionStore';
import { showNotification } from './notificationHelper';

import type { Extension, ExtensionManifest } from '../stores/useExtensionStore';

async function loadAndExecuteExtension(extension: Extension): Promise<void> {
  const { id, url, name, entry } = extension;
  const { setExtensionStatus } = useExtensionStore.getState();

  const repoInfo = parseGitHubUrl(url);
  if (!repoInfo) {
    setExtensionStatus(id, 'error', ['Invalid GitHub URL']);
    return;
  }

  const entryPoints = Array.isArray(entry) ? entry : [entry];
  const successLogs: string[] = [];
  const errorLogs: string[] = [];

  for (const entryPoint of entryPoints) {
    if (!entryPoint.trim()) continue;
    const scriptUrl = `https://cdn.jsdelivr.net/gh/${repoInfo.owner}/${repoInfo.repo}/${entryPoint}`;
    try {
      const response = await fetch(scriptUrl);
      if (!response.ok) {
        throw new Error(`Fetch failed for ${entryPoint}: ${response.statusText}`);
      }
      const scriptContent = await response.text();

      try {
        new Function('Baratie', scriptContent)(window.Baratie);
        successLogs.push(entryPoint);
      } catch (e) {
        const execError = e instanceof Error ? e.message : String(e);
        throw new Error(`Execution of ${entryPoint} failed: ${execError}`);
      }
    } catch (e) {
      const loadError = e instanceof Error ? e.message : String(e);
      errorLogs.push(loadError);
    }
  }

  let finalStatus: Extension['status'] = 'error';
  if (successLogs.length > 0) {
    finalStatus = errorLogs.length > 0 ? 'partial' : 'loaded';
  }

  setExtensionStatus(id, finalStatus, errorLogs);

  if (finalStatus === 'loaded') {
    logger.info(`Extension '${name}' loaded successfully.`);
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

export async function addNewExtension(url: string): Promise<void> {
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

  const manifestUrl = `https://cdn.jsdelivr.net/gh/${repoInfo.owner}/${repoInfo.repo}/manifest.json`;

  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`Could not fetch manifest: ${response.statusText}`);
    }
    const manifest = (await response.json()) as ExtensionManifest;

    const entry = manifest.entry;
    if (!manifest.name || !entry || (Array.isArray(entry) && entry.length === 0)) {
      throw new Error('Manifest must contain a "name" and a non-empty "entry" (string or array).');
    }

    const newExtension: Extension = {
      id,
      url,
      name: manifest.name,
      entry: manifest.entry,
      status: 'loading',
      errors: [],
    };

    addExtension(newExtension);
    showNotification(`Adding extension '${manifest.name}'...`, 'info', 'Extension Manager');
    await loadAndExecuteExtension(newExtension);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    showNotification(`Failed to add extension: ${errorMessage}`, 'error', 'Add Extension Error');
    logger.error(`Error adding extension from URL ${url}:`, e);
    if (useExtensionStore.getState().extensions.find((ext) => ext.id === id)) {
      setExtensionStatus(id, 'error', [errorMessage]);
    }
  }
}

export function initExtensions(): void {
  const rawExtensions = storage.get(STORAGE_EXTENSIONS, 'Extensions');
  const extensions: Extension[] = [];

  if (Array.isArray(rawExtensions)) {
    for (const raw of rawExtensions) {
      if (typeof raw === 'object' && raw !== null && 'id' in raw && 'url' in raw && 'name' in raw && 'entry' in raw) {
        extensions.push({ ...(raw as Omit<Extension, 'status' | 'errors'>), status: 'loading', errors: [] });
      }
    }
  }

  useExtensionStore.getState().setExtensions(extensions);

  for (const ext of extensions) {
    loadAndExecuteExtension(ext).catch((e) => logger.error(`Error loading extension on init: ${ext.name}`, e));
  }
}

export function removeExtension(id: string): void {
  useExtensionStore.getState().remove(id);
  showNotification('Extension removed. A page reload is required to fully unload its ingredients.', 'info', 'Extension Manager', 7000);
}
