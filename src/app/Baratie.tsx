import './styles.css';

import { clsx } from 'clsx';
import { StrictMode, useEffect } from 'react';
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
import { useOverflow } from '../hooks/useOverflow';
import { internalIngredients } from '../ingredients';
import { useDragMoveStore } from '../stores/useDragMoveStore';
import { useExtensionStore } from '../stores/useExtensionStore';
import { useTaskStore } from '../stores/useTaskStore';
import { useThemeStore } from '../stores/useThemeStore';
import { errorHandler, ingredientRegistry, kitchen, taskRegistry } from './container';

import type { JSX } from 'react';

export interface BaratieOptions {
  readonly disableIngredients?: boolean;
  readonly defaultExtensions?: string | ReadonlyArray<string>;
}

const Baratie = (): JSX.Element => {
  const isAppReady = useTaskStore((state) => state.isInitialized);
  const theme = useThemeStore((state) => state.id);
  const { ref: scrollRef, className: scrollClasses } = useOverflow<HTMLDivElement>();
  const isDragging = useDragMoveStore((state) => !!state.draggedItemId);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle('grabbing', isDragging);
    return () => {
      document.body.classList.remove('grabbing');
    };
  }, [isDragging]);

  useEffect(() => {
    if (isAppReady) {
      return kitchen.initAutoCook();
    }
  }, [isAppReady]);

  const mainContentClass = clsx('main-content-wrapper', isAppReady ? 'opacity-100' : 'opacity-0');
  const rootLayoutClass = clsx('main-layout-root', scrollClasses);

  return (
    <>
      <LoadingScreen />
      <main className={mainContentClass}>
        <div ref={scrollRef} className={rootLayoutClass}>
          <section className="section-column md:flex-row">
            <IngredientPanel />
            <RecipePanel />
          </section>

          <section className="section-column">
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
};

export function createRoot(element: HTMLElement | null, options: Readonly<BaratieOptions> = {}): void {
  errorHandler.assert(element, 'Could not find the root element to mount the application.', 'Baratie Mount');

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
        const { setLoadingMessage } = useTaskStore.getState();
        const extensionsToLoad = Array.isArray(defaultExtensions) ? defaultExtensions : [defaultExtensions];
        const totalExtensions = extensionsToLoad.length;
        const progressMap = new Array(totalExtensions).fill(0);

        const updateProgress = () => {
          const totalProgress = progressMap.reduce((acc, curr) => acc + curr, 0);
          const percent = Math.min(100, Math.round((totalProgress / totalExtensions) * 100));
          setLoadingMessage(`Gathering exotic provisions... ${percent}%`);
        };

        const loadPromises = extensionsToLoad.map(async (url, index) => {
          const repoInfo = parseGitHubUrl(url);
          if (repoInfo) {
            const repoName = `${repoInfo.owner}/${repoInfo.repo}@${repoInfo.ref}`;
            if (extensionMap.has(repoName)) {
              progressMap[index] = 1;
              updateProgress();
              return;
            }

            await add(url, {
              force: true,
              onProgress: (p) => {
                progressMap[index] = p;
                updateProgress();
              },
            });
            progressMap[index] = 1;
            updateProgress();
          } else {
            progressMap[index] = 1;
            updateProgress();
          }
        });

        await Promise.all(loadPromises);
      },
    });
  }

  taskRegistry.init();

  const root = createReactRoot(element);

  root.render(
    <StrictMode>
      <ErrorBoundary>
        <Baratie />
      </ErrorBoundary>
    </StrictMode>,
  );
}
