import { AppRegistry } from '../core/AppRegistry';
import { ErrorHandler } from '../core/ErrorHandler';
import { IngredientRegistry } from '../core/IngredientRegistry';
import { Kitchen } from '../core/Kitchen';
import { Logger, LogLevel } from '../core/Logger';
import { Storage } from '../core/Storage';

const LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN;
export const logger: Logger = new Logger(LOG_LEVEL);

export const errorHandler: ErrorHandler = new ErrorHandler();
export const storage: Storage = new Storage();
export const ingredientRegistry: IngredientRegistry = new IngredientRegistry();
export const kitchen: Kitchen = new Kitchen();
export const appRegistry: AppRegistry = new AppRegistry();
