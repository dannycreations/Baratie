import { errorHandler, logger } from '../app/container';
import { useCookbookStore } from '../stores/useCookbookStore';
import { useExtensionStore } from '../stores/useExtensionStore';
import { useFavoriteStore } from '../stores/useFavoriteStore';
import { useIngredientStore } from '../stores/useIngredientStore';
import { useRecipeStore } from '../stores/useRecipeStore';
import { useTaskStore } from '../stores/useTaskStore';

interface InitializationTask {
  readonly type?: 'preInit' | 'postInit';
  readonly message: string;
  readonly isConcurrent?: boolean;
  readonly handler?: () => unknown;
}

export class TaskRegistry {
  private readonly systemTasks: ReadonlyArray<InitializationTask> = [
    {
      message: 'Sharpening the cutlasses...',
    },
    {
      message: 'Loading supplies from other vessels...',
      handler: () => useExtensionStore.getState().init(),
    },
    {
      message: 'Polishing the favorite knives...',
      handler: () => useFavoriteStore.getState().init(),
    },
    {
      message: 'Unfurling the recipe scrolls...',
      handler: () => useCookbookStore.getState().init(),
    },
    {
      message: 'Remembering the current recipe...',
      handler: () => useRecipeStore.getState().init(),
    },
    {
      message: "Consulting the ship's log...",
      handler: () => useIngredientStore.getState().init(),
    },
    {
      message: 'Prepping the Mise en Place...',
    },
  ];
  private readonly userTasks: Array<InitializationTask> = [];
  private isRunning = false;

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
      const taskStore = useTaskStore.getState();

      const runTaskGroup = async (tasks: ReadonlyArray<InitializationTask>) => {
        const concurrentTasks = tasks.filter((t) => t.isConcurrent);
        const sequentialTasks = tasks.filter((t) => !t.isConcurrent);

        // Run concurrent tasks
        const concurrentPromises = concurrentTasks.map(async (task) => {
          logger.debug(`Executing concurrent init task: ${task.message}`);
          if (!task.handler) return;

          const context = `Init: ${task.message}`;
          const options = { genericMessage: `Failed during task: ${task.message}`, shouldNotify: false };
          const { error } = await errorHandler.attemptAsync(task.handler, context, options);

          if (error) {
            const errorMessage = error.userMessage || error.message;
            taskStore.setLoadingMessage(errorMessage, true);
            throw error;
          }
        });

        // Run sequential tasks
        for (const task of sequentialTasks) {
          taskStore.setLoadingMessage(task.message);
          logger.debug(`Executing init task: ${task.message}`);

          if (task.handler) {
            const context = `Init: ${task.message}`;
            const options = { genericMessage: `Failed during task: ${task.message}`, shouldNotify: false };
            const { error } = await errorHandler.attemptAsync(task.handler, context, options);

            if (error) {
              const errorMessage = error.userMessage || error.message;
              taskStore.setLoadingMessage(errorMessage, true);
              throw error;
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        await Promise.all(concurrentPromises);
      };

      await runTaskGroup(preTasks);
      await runTaskGroup(this.systemTasks);
      await runTaskGroup(postTasks);

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
