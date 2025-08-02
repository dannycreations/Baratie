import { memo, StrictMode, useEffect } from 'react';
import { createRoot as createReactRoot } from 'react-dom/client';

import { CookbookPanel } from '../components/cookbook/CookbookPanel';
import { IngredientPanel } from '../components/ingredient/IngredientPanel';
import { KitchenPanel } from '../components/kitchen/KitchenPanel';
import { ErrorBoundary } from '../components/main/ErrorBoundary';
import { LoadingScreen } from '../components/main/LoadingScreen';
import { NotificationPanel } from '../components/main/NotificationPanel';
import { RecipePanel } from '../components/recipe/RecipePanel';
import { SettingPanel } from '../components/setting/SettingPanel';
import { parseGitHubUrl } from '../helpers/extensionHelper';
import { internalIngredients } from '../ingredients';
import { useExtensionStore } from '../stores/useExtensionStore';
import { useTaskStore } from '../stores/useTaskStore';
import { errorHandler, ingredientRegistry, kitchen, logger, taskRegistry } from './container';
import { APP_STYLES } from './styles';

import type { JSX } from 'react';

const APP_STYLES_ID = 'baratie-global-styles';

export interface BaratieOptions {
  readonly disableIngredients?: boolean;
  readonly defaultExtensions?: string | ReadonlyArray<string>;
}

const BaratieView = memo((): JSX.Element => {
  const isAppReady = useTaskStore((state) => state.isInitialized);

  useEffect(() => {
    if (isAppReady) {
      return kitchen.initAutoCook();
    }
  }, [isAppReady]);

  const mainContentClass = `h-screen w-screen overflow-hidden transition-opacity duration-300 ${isAppReady ? 'opacity-100' : 'opacity-0'}`;

  return (
    <>
      <LoadingScreen />
      <main className={mainContentClass}>
        <div className="flex h-full w-full flex-col gap-3 overflow-y-auto p-3 md:flex-row md:overflow-hidden">
          <section className="flex w-full flex-col gap-3 md:flex-1 md:flex-row md:overflow-hidden">
            <IngredientPanel />
            <RecipePanel />
          </section>

          <section className="flex w-full flex-col gap-3 md:flex-1 md:overflow-hidden">
            <KitchenPanel type="input" />
            <KitchenPanel type="output" />
          </section>
        </div>

        <NotificationPanel />
        <CookbookPanel />
        <SettingPanel />
      </main>
    </>
  );
});

export function createRoot(element: HTMLElement | null, options: Readonly<BaratieOptions> = {}): void {
  errorHandler.assert(element, 'Could not find the root element to mount the application.', 'Baratie Mount');

  if (!document.getElementById(APP_STYLES_ID)) {
    const style = document.createElement('style');
    style.id = APP_STYLES_ID;
    style.textContent = APP_STYLES;
    document.head.appendChild(style);
  }

  const { disableIngredients, defaultExtensions } = options;

  if (!disableIngredients) {
    taskRegistry.register({
      type: 'preInit',
      message: 'Stocking rare ingredients...',
      handler: () => {
        try {
          ingredientRegistry.startBatch();
          for (const definition of internalIngredients) {
            ingredientRegistry.register(definition, 'baratie');
          }
        } finally {
          ingredientRegistry.endBatch();
        }
      },
    });
  }

  if (defaultExtensions) {
    taskRegistry.register({
      type: 'postInit',
      message: 'Gathering exotic provisions...',
      handler: async () => {
        const { add, extensionMap } = useExtensionStore.getState();
        const extensionsToLoad = Array.isArray(defaultExtensions) ? defaultExtensions : [defaultExtensions];

        for (const url of extensionsToLoad) {
          const repoInfo = parseGitHubUrl(url);
          if (repoInfo) {
            const repoName = `${repoInfo.owner}/${repoInfo.repo}@${repoInfo.ref}`;
            if (extensionMap.has(repoName)) {
              continue;
            }

            await add(url, { force: true });
          } else {
            logger.warn(`Invalid default extension URL provided: "${url}"`);
          }
        }
      },
    });
  }

  taskRegistry.init();

  const root = createReactRoot(element);

  root.render(
    <StrictMode>
      <ErrorBoundary>
        <BaratieView />
      </ErrorBoundary>
    </StrictMode>,
  );
}
