import { errorHandler, logger } from '../app/container';
import { useCookbookStore } from '../stores/useCookbookStore';
import { useExtensionStore } from '../stores/useExtensionStore';
import { useFavoriteStore } from '../stores/useFavoriteStore';
import { useIngredientStore } from '../stores/useIngredientStore';
import { useTaskStore } from '../stores/useTaskStore';

interface InitializationTask {
  readonly type?: 'preInit' | 'postInit';
  readonly message: string;
  readonly handler?: () => unknown;
}

export class TaskRegistry {
  private readonly systemTasks: ReadonlyArray<InitializationTask>;
  private readonly userTasks: Array<InitializationTask> = [];
  private isRunning = false;

  public constructor() {
    this.systemTasks = [
      {
        message: 'Sharpening the cutlasses...',
      },
      {
        message: 'Loading supplies from other vessels...',
        handler: () => {
          return useExtensionStore.getState().init();
        },
      },
      {
        message: 'Polishing the favorite knives...',
        handler: () => {
          return useFavoriteStore.getState().init();
        },
      },
      {
        message: 'Unfurling the recipe scrolls...',
        handler: () => {
          return useCookbookStore.getState().init();
        },
      },
      {
        message: "Consulting the ship's log...",
        handler: () => {
          return useIngredientStore.getState().init();
        },
      },
      {
        message: 'Prepping the Mise en Place...',
      },
    ];
  }

  public async init(): Promise<void> {
    if (this.isRunning) {
      logger.info('Initialization sequence already running.');
      return;
    }

    if (useTaskStore.getState().isInitialized) {
      return;
    }

    this.isRunning = true;
    logger.info('Starting application initialization sequence.');

    try {
      const preTasks = this.userTasks.filter((task) => task.type === 'preInit');
      const postTasks = this.userTasks.filter((task) => task.type === 'postInit');
      const allTasks = [...preTasks, ...this.systemTasks, ...postTasks];

      for (const task of allTasks) {
        useTaskStore.getState().setLoadingMessage(task.message);
        logger.debug(`Executing init task: ${task.message}`);

        if (task.handler) {
          const { error } = await errorHandler.attemptAsync(task.handler, `Init: ${task.message}`, {
            genericMessage: `Failed during task: ${task.message}`,
            shouldNotify: false,
          });

          if (error) {
            useTaskStore.getState().setLoadingMessage(error.userMessage || error.message, true);
            return;
          }
        }

        await new Promise((resolve) => {
          setTimeout(resolve, 200);
        });
      }

      useTaskStore.getState().setInitialized(true);
      logger.info('Application initialization sequence completed successfully.');
    } finally {
      this.isRunning = false;
    }
  }

  public register(task: InitializationTask): void {
    this.userTasks.push({ type: 'preInit', ...task });
  }
}
