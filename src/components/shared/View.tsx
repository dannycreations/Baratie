import { memo } from 'react';

import { useOverflowScroll } from '../../hooks/useOverflowScroll';
import { useThemeStore } from '../../stores/useThemeStore';
import { createErrorObject, objectStringify } from '../../utilities/errorUtil';

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
  const errorObject = createErrorObject(error);
  if (errorInfo?.componentStack) {
    errorObject.componentStack = errorInfo.componentStack.split('\n').map((line) => line.trim());
  }
  return objectStringify(errorObject, 2);
}

export const EmptyView = memo<EmptyViewProps>(
  ({ children, className = 'flex grow flex-col items-center justify-center p-4', textClassName, icon, title }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const titleClasses = `mb-1 text-lg font-semibold text-center text-${theme.contentSecondary}`;
    const textClasses = textClassName ?? `break-all text-center text-sm text-${theme.contentTertiary}`;

    return (
      <div role="status" aria-live="polite" className={className}>
        {icon && (
          <div aria-hidden="true" className={`mb-2 text-${theme.contentTertiary}`}>
            {icon}
          </div>
        )}
        {title && <h3 className={titleClasses}>{title}</h3>}
        <div className={textClasses}>{children}</div>
      </div>
    );
  },
);

export const ErrorView = memo<ErrorViewProps>(({ error, errorInfo }): JSX.Element | null => {
  const detailsElementRef = useOverflowScroll<HTMLDetailsElement>({ xClassName: 'pr-2', yClassName: 'pb-2' });
  const theme = useThemeStore((state) => state.theme);

  if (!error) {
    return null;
  }

  const detailsClasses = `mt-6 max-h-48 overflow-y-auto rounded-md bg-${theme.surfaceTertiary} p-3 text-left text-xs`;
  const summaryClasses = `cursor-pointer font-medium text-${theme.contentTertiary} hover:text-${theme.contentPrimary}`;
  const preClasses = `mt-2 whitespace-pre-wrap text-${theme.contentSecondary} allow-text-selection`;

  return (
    <details ref={detailsElementRef} className={detailsClasses}>
      <summary className={summaryClasses}>Error Details (Development)</summary>
      <pre className={preClasses}>{errorStringify(error, errorInfo)}</pre>
    </details>
  );
});
