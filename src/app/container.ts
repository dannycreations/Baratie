import { ErrorHandler } from '../core/ErrorHandler';
import { IngredientRegistry } from '../core/IngredientRegistry';
import { Kitchen } from '../core/Kitchen';
import { Logger, LogLevel } from '../core/Logger';
import { Storage } from '../core/Storage';
import { TaskRegistry } from '../core/TaskRegistry';

export const logger: Logger = new Logger(LogLevel.WARN);
export const storage: Storage = new Storage();
export const taskRegistry: TaskRegistry = new TaskRegistry();
export const errorHandler: ErrorHandler = new ErrorHandler();
export const ingredientRegistry: IngredientRegistry = new IngredientRegistry();
export const kitchen: Kitchen = new Kitchen();
