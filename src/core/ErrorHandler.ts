import { logger } from '../app/container';
import { showNotification } from '../helpers/notificationHelper';

export class AppError extends Error {
  public readonly context?: string;
  public readonly userMessage?: string;
  public readonly cause?: unknown;

  public constructor(techMessage: string, context?: string, userMessage?: string, cause?: unknown) {
    super(techMessage);
    this.name = 'AppError';
    this.context = context;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

interface ErrorOptions {
  readonly defaultMessage?: string;
  readonly genericMessage?: string;
  readonly shouldLog?: boolean;
  readonly notificationTitle?: string;
  readonly shouldNotify?: boolean;
}

interface AttemptOptions extends Partial<ErrorOptions> {}

interface AttemptResult<T, E> {
  readonly error: E | AppError | null;
  readonly result: T | null;
}

export class ErrorHandler {
  private static readonly DEFAULT_ERROR_CONFIG: Readonly<ErrorOptions> = {
    defaultMessage: 'An unexpected error occurred. Please try again, or check the console for details.',
    shouldLog: true,
    notificationTitle: 'Application Error',
    shouldNotify: true,
  };

  public assert(condition: unknown, techMessage: string, context?: string, options: Partial<ErrorOptions> = {}): asserts condition {
    if (condition) {
      return;
    }

    const error = new AppError(techMessage, context, options.genericMessage || options.defaultMessage);
    this.handle(error, undefined, options);
    throw error;
  }

  public attempt<T, E = Error>(fn: () => T, context?: string, options?: AttemptOptions): AttemptResult<T, E> {
    try {
      const result = fn();
      return { result, error: null };
    } catch (error: unknown) {
      const handlerOptions = { ...ErrorHandler.DEFAULT_ERROR_CONFIG, ...options };
      const newError = this.buildError(error, context || 'Sync Operation', handlerOptions.defaultMessage, handlerOptions.genericMessage);

      this.handle(newError, undefined, handlerOptions);
      return { result: null, error: newError };
    }
  }

  public async attemptAsync<T, E = Error>(fn: () => T | Promise<T>, context?: string, options?: AttemptOptions): Promise<AttemptResult<T, E>> {
    try {
      const result = await fn();
      return { result, error: null };
    } catch (error: unknown) {
      const handlerOptions = { ...ErrorHandler.DEFAULT_ERROR_CONFIG, ...options };
      const newError = this.buildError(error, context || 'Async Operation', handlerOptions.defaultMessage, handlerOptions.genericMessage);

      this.handle(newError, undefined, handlerOptions);
      return { result: null, error: newError };
    }
  }

  public handle(error: unknown, callerContext?: string, options: Partial<ErrorOptions> = {}): void {
    const handlerOptions = { ...ErrorHandler.DEFAULT_ERROR_CONFIG, ...options };
    const newError = this.buildError(error, callerContext, handlerOptions.defaultMessage, handlerOptions.genericMessage);
    const effectiveContext = newError.context || 'Application';
    const displayMessage = newError.userMessage || ErrorHandler.DEFAULT_ERROR_CONFIG.defaultMessage!;
    const notificationTitle = handlerOptions.notificationTitle || `Error: ${effectiveContext}`;

    if (handlerOptions.shouldLog) {
      logger.error(`Context: ${effectiveContext} | ${newError.name}: ${newError.message}`, {
        cause: newError.cause,
        stack: newError.stack,
        userMessage: newError.userMessage,
      });
    }

    if (handlerOptions.shouldNotify) {
      const messageToShow = displayMessage.trim() || handlerOptions.defaultMessage!;
      try {
        showNotification(messageToShow, 'error', notificationTitle, 7000);
      } catch (notificationError) {
        logger.error('ErrorHandler: Failed to show a notification due to an internal notification system error.', {
          notificationSystemError: notificationError,
          originalError: newError.message,
        });
      }
    }
  }

  private buildError(error: unknown, callerContext?: string, defaultMessage?: string, genericMessage?: string): AppError {
    let baseMessage: string;
    let baseContext: string | undefined;
    let baseUserMessage: string | undefined;
    let baseCause: unknown;

    if (error instanceof AppError) {
      baseMessage = error.message;
      baseContext = error.context;
      baseUserMessage = error.userMessage;
      baseCause = error.cause ?? error;
    } else if (error instanceof Error) {
      baseMessage = error.message;
      baseCause = error;
    } else {
      try {
        baseMessage = `Unknown error: ${JSON.stringify(error)}`;
      } catch {
        baseMessage = `Unknown error: ${String(error)}`;
      }
      baseCause = error;
    }

    const finalContext = callerContext || baseContext;
    const finalUserMessage = genericMessage || baseUserMessage || defaultMessage;

    return new AppError(baseMessage, finalContext, finalUserMessage, baseCause);
  }
}
