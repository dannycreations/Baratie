import { memo } from 'react';

import { createErrorObject, objectStringify } from '../../utilities/errorUtil';

import type { ErrorInfo, JSX, ReactNode } from 'react';

interface EmptyViewProps {
  readonly children?: ReactNode;
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
  const titleClass = 'mb-1 text-center font-semibold text-lg text-content-secondary';

  const textClass = textClasses ?? 'w-full break-words text-center text-sm text-content-tertiary';

  return (
    <div className={className}>
      {icon && <div className="mb-2 text-content-tertiary">{icon}</div>}
      {title && <h3 className={titleClass}>{title}</h3>}
      <p className={textClass}>{children}</p>
    </div>
  );
};

export const ErrorView = memo<ErrorViewProps>(({ error, errorInfo }): JSX.Element | null => {
  if (!error) {
    return null;
  }

  const detailsClass = 'max-h-48 mt-3 p-2 overflow-y-auto rounded-md text-left text-xs bg-surface-tertiary transition-all duration-300';
  const summaryClass = 'font-medium cursor-pointer text-content-tertiary hover:text-content-primary';
  const preClass = 'mt-2 whitespace-pre-wrap allow-text-selection text-content-secondary';

  return (
    <details className={detailsClass}>
      <summary className={summaryClass}>Error Details (Development)</summary>
      <pre className={preClass}>{errorStringify(error, errorInfo)}</pre>
    </details>
  );
});
