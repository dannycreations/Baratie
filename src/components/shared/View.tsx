import { memo } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';
import { createErrorObject, objectStringify } from '../../utilities/errorUtil';
import { cn } from '../../utilities/styleUtil';

import type { ErrorInfo, JSX, ReactNode } from 'react';

interface EmptyViewProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly icon?: ReactNode;
  readonly textClasses?: string;
  readonly title?: string;
}

interface ErrorViewProps {
  readonly error: Error | null;
  readonly errorInfo: ErrorInfo | null;
}

function errorStringify(error: Error, errorInfo: ErrorInfo | null): string {
  const errorObject = createErrorObject(error);
  if (errorInfo?.componentStack) {
    errorObject.componentStack = errorInfo.componentStack.split('\n').map((line) => line.trim());
  }
  return objectStringify(errorObject, 2);
}

export const EmptyView = ({
  children,
  className = 'flex flex-col items-center justify-center p-3',
  textClasses,
  icon,
  title,
}: EmptyViewProps): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const titleClass = cn('mb-1 text-center font-semibold text-lg', `text-${theme.contentSecondary}`);

  const textClass = textClasses ?? cn('w-full break-words text-center text-sm', `text-${theme.contentTertiary}`);

  return (
    <div className={className}>
      {icon && <div className={cn('mb-2', `text-${theme.contentTertiary}`)}>{icon}</div>}
      {title && <h3 className={titleClass}>{title}</h3>}
      <p className={textClass}>{children}</p>
    </div>
  );
};

export const ErrorView = memo<ErrorViewProps>(({ error, errorInfo }): JSX.Element | null => {
  const theme = useThemeStore((state) => state.theme);

  if (!error) {
    return null;
  }

  const detailsClass = cn('max-h-48 mt-3 p-2 overflow-y-auto rounded-md text-left text-xs', `bg-${theme.surfaceTertiary}`);
  const summaryClass = cn('font-medium cursor-pointer', `text-${theme.contentTertiary}`, `hover:text-${theme.contentPrimary}`);
  const preClass = cn('mt-2 whitespace-pre-wrap allow-text-selection', `text-${theme.contentSecondary}`);

  return (
    <details className={detailsClass}>
      <summary className={summaryClass}>Error Details (Development)</summary>
      <pre className={preClass}>{errorStringify(error, errorInfo)}</pre>
    </details>
  );
});
