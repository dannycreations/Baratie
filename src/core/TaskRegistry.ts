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
      isConcurrent: true,
    },
    {
      message: 'Loading supplies from other vessels...',
      isConcurrent: true,
      handler: () => useExtensionStore.getState().init(),
    },
    {
      message: 'Polishing the favorite knives...',
      isConcurrent: true,
      handler: () => useFavoriteStore.getState().init(),
    },
    {
      message: 'Unfurling the recipe scrolls...',
      isConcurrent: true,
      handler: () => useCookbookStore.getState().init(),
    },
    {
      message: 'Remembering the current recipe...',
      isConcurrent: true,
      handler: () => useRecipeStore.getState().init(),
    },
    {
      message: "Consulting the ship's log...",
      isConcurrent: true,
      handler: () => useIngredientStore.getState().init(),
    },
    {
      message: 'Prepping the Mise en Place...',
      isConcurrent: true,
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

      const runTask = async (task: InitializationTask): Promise<void> => {
        logger.debug(`Executing init task: ${task.message}`);
        if (!task.handler) {
          return;
        }

        const { error } = await errorHandler.attemptAsync(task.handler, `Init: ${task.message}`, {
          genericMessage: `Failed during task: ${task.message}`,
          shouldNotify: false,
        });

        if (error) {
          taskStore.setLoadingMessage(error.userMessage || error.message, true);
          throw error;
        }
      };

      const runTaskGroup = async (tasks: ReadonlyArray<InitializationTask>) => {
        const concurrentPromises = tasks.filter((t) => t.isConcurrent).map(runTask);

        for (const task of tasks.filter((t) => !t.isConcurrent)) {
          taskStore.setLoadingMessage(task.message);
          await runTask(task);
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        await Promise.all(concurrentPromises);
      };

      await runTaskGroup(preTasks);
      await runTaskGroup(this.systemTasks);
      await runTaskGroup(postTasks);

      taskStore.setInitialized(true);
      logger.info('Application initialization sequence completed successfully.');
    } finally {
      this.isRunning = false;
    }
  }

  public register(task: InitializationTask): void {
    this.userTasks.push({ type: 'preInit', ...task });
  }
}
