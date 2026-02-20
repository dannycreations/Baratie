import { RefreshCw } from 'lucide-react';
import { Component } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { logger } from '../../app/container';
import { Button } from '../shared/Button';
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

const ErrorDisplay = ({ error, errorInfo }: ErrorDisplayProps): JSX.Element => (
  <div className="dialog-backdrop">
    <div className="dialog-container border border-danger-border">
      <div className="dialog-icon-large">⚠️</div>
      <h2 className="dialog-title-large">A Kitchen Catastrophe!</h2>
      <p className="mb-3 text-content-secondary">A sudden squall has hit the galley! Reloading might calm the seas.</p>
      <Button icon={<RefreshCw size={ICON_SIZES.MD} />} size="sm" variant="primary" onClick={() => window.location.reload()}>
        Batten Down the Hatches!
      </Button>
      {error && <ErrorView error={error} errorInfo={errorInfo} />}
    </div>
  </div>
);

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
