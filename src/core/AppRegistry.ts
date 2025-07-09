import { errorHandler, logger } from '../app/container';
import { initCookbook } from '../helpers/cookbookHelper';
import { initExtensions } from '../helpers/extensionHelper';
import { initFavorites } from '../helpers/favoriteHelper';
import { initIngPrefs } from '../helpers/ingredientHelper';
import { useAppStore } from '../stores/useAppStore';
import { useThemeStore } from '../stores/useThemeStore';

type InitializationTask = {
  readonly type?: 'preInit' | 'postInit';
  readonly message: string;
  readonly handler?: () => unknown;
};

export class AppRegistry {
  private readonly systemTasks: readonly InitializationTask[];
  private readonly userTasks: InitializationTask[] = [];
  private isRunning = false;
  private subscriptionsSetup = false;

  public constructor() {
    this.systemTasks = [
      { message: 'Sharpening the cutlasses...' },
      {
        message: 'Loading supplies from other vessels...',
        handler: () => initExtensions(),
      },
      {
        message: 'Polishing the favorite knives...',
        handler: () => initFavorites(),
      },
      {
        message: 'Unfurling the recipe scrolls...',
        handler: () => initCookbook(),
      },
      {
        message: "Consulting the ship's log...",
        handler: () => initIngPrefs(),
      },
      { message: 'Prepping the Mise en Place...' },
    ];
  }

  public registerTask(task: InitializationTask): void {
    this.userTasks.push({ type: 'preInit', ...task });
  }

  public async runInitSequence(): Promise<void> {
    if (this.isRunning) {
      logger.info('Initialization sequence already running.');
      return;
    }
    if (useAppStore.getState().isInitialized) {
      return;
    }

    this.setupSubscriptions();
    this.isRunning = true;
    logger.info('Starting application initialization sequence.');

    try {
      const preTasks = this.userTasks.filter((task) => task.type === 'preInit');
      const postTasks = this.userTasks.filter((task) => task.type === 'postInit');
      const allTasks = [...preTasks, ...this.systemTasks, ...postTasks];

      const { error } = await errorHandler.attemptAsync(
        async () => {
          for (const task of allTasks) {
            useAppStore.getState().setLoadingMessage(task.message);
            logger.debug(`Executing init task: ${task.message}`);
            await task.handler?.();
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        },
        'App Initialization',
        {
          shouldNotify: false,
        },
      );

      if (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        useAppStore.getState().setLoadingMessage(`Initialization Failed: ${message}`, true);
      } else {
        useAppStore.getState().setInitialized(true);
        logger.info('Application initialization sequence completed successfully.');
      }
    } finally {
      this.isRunning = false;
    }
  }

  private setupSubscriptions(): void {
    if (this.subscriptionsSetup) {
      return;
    }

    useThemeStore.subscribe(
      (state) => state.theme,
      (theme) => {
        const style = document.documentElement.style;
        style.setProperty('--scrollbar-thumb', theme.scrollbarThumb);
        style.setProperty('--scrollbar-thumb-hover', theme.scrollbarThumbHover);
      },
      { fireImmediately: true },
    );

    this.subscriptionsSetup = true;
  }
}
