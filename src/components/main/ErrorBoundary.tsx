import { Component } from 'react';

import { logger } from '../../app/container';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button } from '../shared/Button';
import { RefreshCwIcon } from '../shared/Icon';
import { ErrorView } from '../shared/View';

import type { ErrorInfo, JSX, ReactNode } from 'react';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
  readonly errorInfo: ErrorInfo | null;
}

interface ErrorDisplayProps {
  readonly error: Error | null;
  readonly errorInfo: ErrorInfo | null;
}

const ERROR_DESCRIPTION_ID = 'error-dialog-description';

function ErrorDisplay({ error, errorInfo }: ErrorDisplayProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);

  const backdropClasses = ['fixed', 'inset-0', 'z-50', 'flex', 'items-center', 'justify-center', 'p-4', 'backdrop-blur-sm', theme.modalBackdropHeavy]
    .filter(Boolean)
    .join(' ');
  const dialogClasses = [
    'w-full',
    'max-w-md',
    'rounded-lg',
    'border',
    'p-6',
    'text-center',
    'sm:max-w-lg',
    'md:max-w-2xl',
    'md:p-8',
    theme.cardBg,
    theme.errorBorderLight,
    theme.shadow2xl,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-dialog-title"
      aria-describedby={ERROR_DESCRIPTION_ID}
      className={backdropClasses}
    >
      <div className={dialogClasses}>
        <div role="img" aria-label="Warning" className={['mb-4', 'text-5xl', theme.errorTextDark].join(' ')}>
          ⚠️
        </div>
        <h2 id="error-dialog-title" className={['mb-3', 'text-2xl', 'font-bold', theme.errorText].join(' ')}>
          A Kitchen Catastrophe!
        </h2>
        <p id={ERROR_DESCRIPTION_ID} className={['mb-6', theme.textSecondary].join(' ')}>
          A sudden squall has hit the galley! Reloading might calm the seas.
        </p>
        <Button
          aria-label="Reload the application to try again"
          icon={<RefreshCwIcon size={20} />}
          onClick={() => window.location.reload()}
          size="md"
          title="Batten Down the Hatches!"
          variant="primary"
        >
          Batten Down the Hatches!
        </Button>
        {process.env.NODE_ENV === 'development' && error && <ErrorView error={error} errorInfo={errorInfo} />}
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} errorInfo={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}
