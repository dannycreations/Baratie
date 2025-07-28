import { memo } from 'react';

import { useOverflowScroll } from '../../hooks/useOverflowScroll';
import { useThemeStore } from '../../stores/useThemeStore';
import { createErrorObject, objectStringify } from '../../utilities/errorUtil';

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

export const EmptyView = memo<EmptyViewProps>(
  ({ children, className = 'flex grow flex-col items-center justify-center p-3', textClasses, icon, title }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const titleClass = `mb-1 text-center text-lg font-semibold text-${theme.contentSecondary}`;
    const textClass = textClasses ?? `break-all text-center text-sm text-${theme.contentTertiary}`;

    return (
      <div className={className} role="status" aria-live="polite">
        {icon && (
          <div aria-hidden="true" className={`mb-2 text-${theme.contentTertiary}`}>
            {icon}
          </div>
        )}
        {title && <h3 className={titleClass}>{title}</h3>}
        <div className={textClass}>{children}</div>
      </div>
    );
  },
);

export const ErrorView = memo<ErrorViewProps>(({ error, errorInfo }): JSX.Element | null => {
  const { ref: detailsElementRef, className: overflowClasses } = useOverflowScroll<HTMLDetailsElement>({ xClasses: 'pb-1', yClasses: 'pr-1' });
  const theme = useThemeStore((state) => state.theme);

  if (!error) {
    return null;
  }

  const detailsClass = `mt-3 max-h-48 overflow-y-auto rounded-md bg-${theme.surfaceTertiary} p-2 text-left text-xs ${overflowClasses}`.trim();
  const summaryClass = `cursor-pointer font-medium text-${theme.contentTertiary} hover:text-${theme.contentPrimary}`;
  const preClass = `mt-2 whitespace-pre-wrap allow-text-selection text-${theme.contentSecondary}`;

  return (
    <details ref={detailsElementRef} className={detailsClass}>
      <summary className={summaryClass}>Error Details (Development)</summary>
      <pre className={preClass}>{errorStringify(error, errorInfo)}</pre>
    </details>
  );
});
