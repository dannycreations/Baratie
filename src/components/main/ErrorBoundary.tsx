import { clsx } from 'clsx';
import { Component } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { logger } from '../../app/container';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button } from '../shared/Button';
import { RefreshCwIcon } from '../shared/Icon';
import { ErrorView } from '../shared/View';

import type { ErrorInfo, JSX, ReactNode } from 'react';

interface ErrorBoundaryProps {
  readonly children?: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
  readonly errorInfo: ErrorInfo | null;
}

type ErrorDisplayProps = Omit<ErrorBoundaryState, 'hasError'>;

function ErrorDisplay({ error, errorInfo }: ErrorDisplayProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);

  const backdropClass = clsx('fixed inset-0 z-[800] flex items-center justify-center p-3 backdrop-blur-sm', `bg-${theme.backdrop}`);
  const dialogClass = clsx(
    'w-full max-w-md p-3 text-center rounded-lg border sm:max-w-lg md:max-w-2xl',
    `border-${theme.dangerBorder}`,
    `bg-${theme.surfaceSecondary}`,
  );

  return (
    <div className={backdropClass}>
      <div className={dialogClass}>
        <div className={clsx('mb-3 text-5xl', `text-${theme.dangerFg}`)}>⚠️</div>
        <h2 className={clsx('mb-2 font-bold text-2xl', `text-${theme.dangerFg}`)}>A Kitchen Catastrophe!</h2>
        <p className={clsx('mb-3', `text-${theme.contentSecondary}`)}>A sudden squall has hit the galley! Reloading might calm the seas.</p>
        <Button icon={<RefreshCwIcon size={ICON_SIZES.MD} />} size="sm" variant="primary" onClick={() => window.location.reload()}>
          Batten Down the Hatches!
        </Button>
        {error && <ErrorView error={error} errorInfo={errorInfo} />}
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} errorInfo={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}
