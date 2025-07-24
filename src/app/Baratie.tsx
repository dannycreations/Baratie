import { memo, StrictMode, useEffect } from 'react';
import { createRoot as createReactRoot } from 'react-dom/client';

import { CookbookPanel } from '../components/cookbook/CookbookPanel';
import { IngredientPanel } from '../components/ingredient/IngredientPanel';
import { KitchenPanel } from '../components/kitchen/KitchenPanel';
import { ErrorBoundary } from '../components/main/ErrorBoundary';
import { LoadingScreen } from '../components/main/LoadingScreen';
import { NotificationPanel } from '../components/main/NotificationPanel';
import { RecipePanel } from '../components/recipe/RecipePanel';
import { ExtensionModal } from '../components/setting/ExtensionModal';
import { SettingPanel } from '../components/setting/SettingPanel';
import { internalIngredients } from '../ingredients';
import { useAppStore } from '../stores/useAppStore';
import { appRegistry, errorHandler, ingredientRegistry, kitchen } from './container';
import { APP_STYLES } from './styles';

import type { JSX } from 'react';

const APP_STYLES_ID = 'baratie-global-styles';

export interface BaratieOptions {
  readonly disableIngredients?: boolean;
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
          aria-label="Main Application Workspace"
          className="flex h-full w-full flex-col gap-4 overflow-y-auto p-4 md:flex-row md:overflow-hidden"
          role="main"
        >
          <section aria-label="Ingredient and Recipe Management" className="flex w-full flex-col gap-4 md:flex-1 md:flex-row md:overflow-hidden">
            <IngredientPanel />
            <RecipePanel />
          </section>
          <section aria-label="Input and Output Panels" className="flex w-full flex-col gap-4 md:flex-1 md:overflow-hidden">
            <KitchenPanel type="input" />
            <KitchenPanel type="output" />
          </section>
        </main>
        <NotificationPanel />
        <CookbookPanel />
        <SettingPanel />
        <ExtensionModal />
      </div>
    </>
  );
});

export function createRoot(element: HTMLElement | null, options?: Readonly<BaratieOptions>): void {
  errorHandler.assert(element, 'Could not find the root element to mount the application.', 'Baratie Mount');

  if (!document.getElementById(APP_STYLES_ID)) {
    const style = document.createElement('style');
    style.id = APP_STYLES_ID;
    style.textContent = APP_STYLES;
    document.head.appendChild(style);
  }

  if (!options?.disableIngredients) {
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
