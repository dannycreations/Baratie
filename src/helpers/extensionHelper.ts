import { array, intersect, nonEmpty, number, object, optional, pipe, record, string, union } from 'valibot';

import { ingredientRegistry, logger } from '../app/container';
import { isObjectLike } from '../utilities/appUtil';

import type { InferInput } from 'valibot';
import type { IngredientDefinition, IngredientRegistry } from '../core/IngredientRegistry';
import type { LoadExtensionDependencies } from '../stores/useExtensionStore';

const EXTENSION_CACHE_MS = 86_400_000;

const NonEmptyString = pipe(string(), nonEmpty());

export const ManifestModuleSchema = object({
  name: NonEmptyString,
  category: NonEmptyString,
  description: NonEmptyString,
  entry: NonEmptyString,
});

export type ManifestModule = InferInput<typeof ManifestModuleSchema>;

const EntrySchema = union([NonEmptyString, pipe(array(NonEmptyString), nonEmpty()), pipe(array(ManifestModuleSchema), nonEmpty())]);

export const ExtensionManifestSchema = object({
  name: NonEmptyString,
  entry: EntrySchema,
});

export type ExtensionManifest = InferInput<typeof ExtensionManifestSchema>;

const BaseExtensionSchema = object({
  id: pipe(string(), nonEmpty()),
  name: pipe(string(), nonEmpty()),
  entry: optional(EntrySchema),
});

type BaseExtension = InferInput<typeof BaseExtensionSchema>;

export const StorableExtensionSchema = intersect([
  BaseExtensionSchema,
  object({
    fetchedAt: number(),
    scripts: record(string(), pipe(string(), nonEmpty())),
  }),
]);

export type StorableExtension = InferInput<typeof StorableExtensionSchema>;

type StoredExtensionData = Pick<StorableExtension, 'fetchedAt' | 'scripts'>;

export type Extension = BaseExtension &
  Partial<StoredExtensionData> & {
    readonly status: 'loading' | 'loaded' | 'error' | 'partial' | 'awaiting';
    readonly errors?: ReadonlyArray<string>;
    readonly ingredients?: ReadonlyArray<string>;
    readonly manifest?: ExtensionManifest;
  };

function executeScript(scriptContent: string, api: typeof window.Baratie): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('Baratie', scriptContent)(api);
  } catch (error) {
    throw new Error(`Execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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

export function isCacheValid(fetchedAt?: number): boolean {
  if (typeof fetchedAt !== 'number') {
    return false;
  }
  return Date.now() - fetchedAt < EXTENSION_CACHE_MS;
}

export function parseGitHubUrl(url: string): { readonly owner: string; readonly repo: string; readonly ref: string } | null {
  const trimmedUrl = url.trim();

  const GH_URL_SHORTHAND_REGEX =
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:(?:\/tree\/|@|#)([\w.-]+))?\/?$|^([\w.-]+)\/([\w.-]+)(?:(?:@|#)([\w.-]+))?$/;

  const match = trimmedUrl.match(GH_URL_SHORTHAND_REGEX);

  if (!match) {
    return null;
  }

  const owner = match[1] || match[4];
  const repo = match[2] || match[5];
  const ref = match[3] || match[6] || 'latest';

  if (match[4] && match[4].includes('.')) {
    return null;
  }

  return { owner, repo, ref };
}

export function updateStateWithExtensions(extensions: ReadonlyArray<Extension>): {
  readonly extensions: ReadonlyArray<Extension>;
  readonly extensionMap: ReadonlyMap<string, Extension>;
} {
  return {
    extensions,
    extensionMap: new Map(extensions.map((ext) => [ext.id, ext])),
  };
}

export async function loadAndExecuteExtension(extension: Readonly<Extension>, dependencies: Readonly<LoadExtensionDependencies>): Promise<void> {
  const { id, name, entry, scripts: cachedScripts } = extension;
  const { setExtensionStatus, setIngredients, upsert, getExtensionMap } = dependencies;

  const repoInfo = parseGitHubUrl(id);
  if (!repoInfo) {
    setExtensionStatus(id, 'error', ['Invalid GitHub URL format.']);
    return;
  }

  const entryPointsOrModules = Array.isArray(entry) ? entry : entry ? [entry] : Object.keys(cachedScripts || {});
  if (entryPointsOrModules.length === 0) {
    setExtensionStatus(id, 'error', ['Extension is missing entry point(s) in its manifest or cache.']);
    return;
  }

  const entryPoints = isObjectLike(entryPointsOrModules[0])
    ? (entryPointsOrModules as ReadonlyArray<ManifestModule>).map((m) => m.entry)
    : (entryPointsOrModules as string[]);

  const newlyRegisteredKeys: Array<string> = [];
  const errorLogs: Array<string> = [];
  const fetchedScripts: Record<string, string> = {};
  let successCount = 0;

  const customBaratieApi = {
    ...window.Baratie,
    ingredient: {
      ...window.Baratie.ingredient,
      register: <T>(definition: IngredientDefinition<T>, _namespace?: string): string => {
        const registeredId = ingredientRegistry.register(definition, id);
        newlyRegisteredKeys.push(registeredId);
        return registeredId;
      },
    } as IngredientRegistry,
  };

  try {
    ingredientRegistry.startBatch();
    for (const entryPoint of entryPoints) {
      if (!entryPoint.trim()) {
        continue;
      }

      try {
        let scriptContent = cachedScripts?.[entryPoint];
        if (!scriptContent) {
          logger.debug(`Cache miss for script: ${entryPoint}`);
          const response = await fetchProvider(repoInfo, entryPoint);
          if (!response.ok) {
            throw new Error(`Fetch failed: ${response.statusText}`);
          }

          scriptContent = await response.text();
          fetchedScripts[entryPoint] = scriptContent;
        } else {
          logger.debug(`Cache hit for script: ${entryPoint}`);
        }

        executeScript(scriptContent, customBaratieApi);
        successCount++;
      } catch (error) {
        errorLogs.push(`Error in '${entryPoint}': ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    ingredientRegistry.endBatch();
  }

  if (!getExtensionMap().has(id)) {
    logger.info(`Extension '${name || id}' was removed during load. Aborting update and cleaning up registered ingredients.`);
    if (newlyRegisteredKeys.length > 0) {
      ingredientRegistry.unregister(newlyRegisteredKeys);
    }
    return;
  }

  if (Object.keys(fetchedScripts).length > 0) {
    upsert({ id, scripts: { ...cachedScripts, ...fetchedScripts } });
  }

  if (newlyRegisteredKeys.length > 0) {
    setIngredients(id, newlyRegisteredKeys);
  }
  const finalStatus: Extension['status'] = successCount > 0 ? (errorLogs.length > 0 ? 'partial' : 'loaded') : 'error';
  setExtensionStatus(id, finalStatus, errorLogs);

  const nameForLog = name || id;
  if (finalStatus === 'loaded') {
    logger.info(`Extension '${nameForLog}' loaded successfully with ${newlyRegisteredKeys.length} ingredient(s).`);
  } else if (finalStatus === 'partial') {
    logger.warn(`Extension '${nameForLog}' partially loaded with ${errorLogs.length} error(s).`, errorLogs);
  } else {
    logger.error(`Extension '${nameForLog}' failed to load with ${errorLogs.length} error(s).`, errorLogs);
  }
}
