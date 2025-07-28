import { Component } from 'react';

import { logger } from '../../app/container';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button } from '../shared/Button';
import { RefreshCwIcon } from '../shared/Icon';
import { ErrorView } from '../shared/View';

import type { ErrorInfo, JSX, ReactNode } from 'react';

const ERROR_DESCRIPTION_ID = 'error-dialog-description';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
  readonly errorInfo: ErrorInfo | null;
}

type ErrorDisplayProps = Omit<ErrorBoundaryState, 'hasError'>;

function ErrorDisplay({ error, errorInfo }: ErrorDisplayProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);

  const backdropClass = `fixed inset-0 z-[800] flex items-center justify-center bg-${theme.backdrop} p-3 backdrop-blur-sm`;
  const dialogClass = `
    w-full max-w-md rounded-lg border border-${theme.dangerBorder}
    bg-${theme.surfaceSecondary} p-3 text-center sm:max-w-lg md:max-w-2xl
  `;

  return (
    <div className={backdropClass} role="alertdialog" aria-modal="true" aria-labelledby="error-dialog-title" aria-describedby={ERROR_DESCRIPTION_ID}>
      <div className={dialogClass}>
        <div role="img" aria-label="Warning" className={`mb-3 text-5xl text-${theme.dangerFg}`}>
          ⚠️
        </div>
        <h2 id="error-dialog-title" className={`mb-2 text-2xl font-bold text-${theme.dangerFg}`}>
          A Kitchen Catastrophe!
        </h2>
        <p id={ERROR_DESCRIPTION_ID} className={`mb-3 text-${theme.contentSecondary}`}>
          A sudden squall has hit the galley! Reloading might calm the seas.
        </p>
        <Button
          icon={<RefreshCwIcon size={20} />}
          size="sm"
          variant="primary"
          aria-label="Reload the application to try again"
          onClick={() => window.location.reload()}
        >
          Batten Down the Hatches!
        </Button>
        {error && <ErrorView error={error} errorInfo={errorInfo} />}
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;

  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} errorInfo={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}
