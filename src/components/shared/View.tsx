import { clsx } from 'clsx';
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

export const EmptyView = ({ children, className, textClasses, icon, title }: EmptyViewProps): JSX.Element => {
  const containerClass = clsx('empty-view-container', className);
  const titleClass = clsx('empty-view-title', 'text-center');
  const textClass = clsx('empty-view-text', 'text-center', textClasses);

  return (
    <div className={containerClass}>
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
