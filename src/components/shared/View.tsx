import { memo } from 'react';

import { AppError } from '../../core/ErrorHandler';
import { useOverflowScroll } from '../../hooks/useOverflowScroll';
import { useThemeStore } from '../../stores/useThemeStore';

import type { ErrorInfo, JSX, ReactNode } from 'react';

interface EmptyViewProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly icon?: ReactNode;
  readonly textClassName?: string;
  readonly title?: string;
}

interface ErrorViewProps {
  readonly error: Error | null;
  readonly errorInfo: ErrorInfo | null;
}

function errorStringify(error: Error, errorInfo: ErrorInfo | null): string {
  const errorObject: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };

  if (error instanceof AppError) {
    if (error.context) {
      errorObject.context = error.context;
    }
    if (error.userMessage) {
      errorObject.userMessage = error.userMessage;
    }
  }

  function hasCause(e: unknown): e is { cause: unknown } {
    return typeof e === 'object' && e !== null && 'cause' in e;
  }

  if (hasCause(error)) {
    const cause = error.cause;
    if (cause) {
      errorObject.cause = cause instanceof Error ? { name: cause.name, message: cause.message, stack: cause.stack } : String(cause);
    }
  }

  if (error.stack) {
    errorObject.stack = error.stack.split('\n').map((line) => line.trim());
  }

  if (errorInfo?.componentStack) {
    errorObject.componentStack = errorInfo.componentStack.split('\n').map((line) => line.trim());
  }

  const cache = new Set();
  const replacer = (_key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    if (value instanceof Error) {
      return {
        message: value.message,
        name: value.name,
        stack: value.stack,
      };
    }
    return value;
  };

  try {
    return JSON.stringify(errorObject, replacer, 2);
  } catch {
    return JSON.stringify(
      {
        name: error.name,
        message: error.message,
        stack: error.stack,
        note: 'Could not stringify the full error object, possibly due to circular references.',
      },
      null,
      2,
    );
  }
}

export const EmptyView = memo(function EmptyView({
  children,
  className = 'flex flex-grow flex-col items-center justify-center p-4',
  textClassName,
  icon,
  title,
}: EmptyViewProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);
  const finalClass = textClassName ?? `break-all text-center text-sm ${theme.textTertiary}`;

  return (
    <div role="status" aria-live="polite" className={className}>
      {icon && (
        <div aria-hidden="true" className={`mb-2 ${theme.textQuaternary}`}>
          {icon}
        </div>
      )}
      {title && <h3 className={`mb-1 text-lg font-semibold ${finalClass}`}>{title}</h3>}
      <div className={finalClass}>{children}</div>
    </div>
  );
});

export const ErrorView = memo(function ErrorView({ error, errorInfo }: ErrorViewProps): JSX.Element | null {
  const detailsElementRef = useOverflowScroll<HTMLDetailsElement>({ xClassName: 'pr-2', yClassName: 'pb-2' });
  const theme = useThemeStore((state) => state.theme);

  if (!error) {
    return null;
  }

  const detailsClasses = `max-h-48 overflow-y-auto rounded-md mt-6 p-3 text-left text-xs ${theme.itemBg}`;
  const summaryClasses = `cursor-pointer font-medium ${theme.textTertiary} ${theme.textSecondaryHover}`;
  const preClasses = `allow-text-selection mt-2 whitespace-pre-wrap ${theme.textSecondary}`;

  return (
    <details ref={detailsElementRef} className={detailsClasses}>
      <summary className={summaryClasses}>Error Details (Development)</summary>
      <pre className={preClasses}>{errorStringify(error, errorInfo)}</pre>
    </details>
  );
});
