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
import { useAppStore } from '../stores/useAppStore';
import { useExtensionStore } from '../stores/useExtensionStore';
import { appRegistry, errorHandler, ingredientRegistry, kitchen, logger } from './container';
import { APP_STYLES } from './styles';

import type { JSX } from 'react';

const APP_STYLES_ID = 'baratie-global-styles';

export interface BaratieOptions {
  readonly disableIngredients?: boolean;
  readonly defaultExtensions?: string | ReadonlyArray<string>;
}

const BaratieView = memo((): JSX.Element => {
  const isAppReady = useAppStore((state) => state.isInitialized);

  useEffect(() => {
    if (isAppReady) {
      return kitchen.initAutoCook();
    }
  }, [isAppReady]);

  const mainContentClass = `h-screen w-screen overflow-hidden transition-opacity duration-300 ${isAppReady ? 'opacity-100' : 'opacity-0'}`;

  return (
    <>
      <LoadingScreen />
      <div className={mainContentClass} aria-hidden={!isAppReady}>
        <main
          className="flex h-full w-full flex-col gap-3 overflow-y-auto p-3 md:flex-row md:overflow-hidden"
          role="main"
          aria-label="Main Application Workspace"
        >
          <section className="flex w-full flex-col gap-3 md:flex-1 md:flex-row md:overflow-hidden" aria-label="Ingredient and Recipe Management">
            <IngredientPanel />
            <RecipePanel />
          </section>

          <section className="flex w-full flex-col gap-3 md:flex-1 md:overflow-hidden" aria-label="Input and Output Panels">
            <KitchenPanel type="input" />
            <KitchenPanel type="output" />
          </section>
        </main>

        <NotificationPanel />
        <CookbookPanel />
        <SettingPanel />
      </div>
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
    appRegistry.registerTask({
      type: 'preInit',
      message: 'Stocking rare ingredients...',
      handler: () => {
        try {
          ingredientRegistry.startBatch();
          for (const definition of internalIngredients) {
            ingredientRegistry.registerIngredient(definition, 'baratie');
          }
        } finally {
          ingredientRegistry.endBatch();
        }
      },
    });
  }

  if (defaultExtensions) {
    appRegistry.registerTask({
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

  appRegistry.runInitSequence();

  const root = createReactRoot(element);

  root.render(
    <StrictMode>
      <ErrorBoundary>
        <BaratieView />
      </ErrorBoundary>
    </StrictMode>,
  );
}
