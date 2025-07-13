import { StrictMode, useEffect } from 'react';
import { createRoot as createReactRoot } from 'react-dom/client';

import { CookbookPanel } from '../components/cookbook/CookbookPanel';
import { IngredientPanel } from '../components/ingredient/IngredientPanel';
import { KitchenPanel } from '../components/kitchen/KitchenPanel';
import { ErrorBoundary } from '../components/main/ErrorBoundary';
import { LoadingScreen } from '../components/main/LoadingScreen';
import { NotificationPanel } from '../components/main/NotificationPanel';
import { SettingPanel } from '../components/main/SettingPanel';
import { RecipePanel } from '../components/recipe/RecipePanel';
import { internalIngredients } from '../ingredients';
import { useAppStore } from '../stores/useAppStore';
import { useThemeStore } from '../stores/useThemeStore';
import { appRegistry, errorHandler, ingredientRegistry, kitchen } from './container';

import type { JSX } from 'react';

export interface BaratieOptions {
  readonly disableIngredients?: boolean;
}

function BaratieView(): JSX.Element {
  const isAppReady = useAppStore((state) => state.isInitialized);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    if (!isAppReady) {
      return;
    }

    const unsubscribe = kitchen.initAutoCook();
    return () => unsubscribe();
  }, [isAppReady]);

  if (!isAppReady) {
    return <LoadingScreen />;
  }

  return (
    <div className={`h-screen w-screen overflow-hidden bg-${theme.surfacePrimary} text-${theme.contentPrimary}`}>
      <main
        aria-label="Main Application Workspace"
        className="flex h-full w-full flex-col gap-4 overflow-y-auto p-4 md:flex-row md:overflow-hidden"
        role="main"
      >
        <section aria-label="Ingredient and Recipe Management" className="flex w-full flex-col gap-4 md:flex-1 md:flex-row md:overflow-hidden">
          <div className="flex h-[50vh] w-full min-h-0 flex-col md:h-auto md:flex-1">
            <IngredientPanel />
          </div>
          <div className="flex h-[50vh] w-full min-h-0 flex-col md:h-auto md:flex-1">
            <RecipePanel />
          </div>
        </section>

        <section aria-label="Input and Output Panels" className="flex w-full flex-col gap-4 md:flex-1 md:overflow-hidden">
          <div className="flex h-[50vh] w-full min-h-0 flex-col md:h-1/2">
            <KitchenPanel type="input" />
          </div>
          <div className="flex h-[50vh] w-full min-h-0 flex-col md:h-1/2">
            <KitchenPanel type="output" />
          </div>
        </section>
      </main>

      <NotificationPanel />
      <CookbookPanel />
      <SettingPanel />
    </div>
  );
}

export function createRoot(element: HTMLElement | null, options?: BaratieOptions): void {
  errorHandler.assert(element, 'Could not find the root element to mount the application.', 'Baratie Mount');

  if (!options?.disableIngredients) {
    appRegistry.registerTask({
      type: 'preInit',
      message: 'Stocking rare ingredients...',
      handler: () => {
        for (const definition of internalIngredients) {
          ingredientRegistry.registerIngredient(definition);
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
