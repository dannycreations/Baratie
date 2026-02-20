import { clsx } from 'clsx';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { useTaskStore } from '../../stores/useTaskStore';

import type { JSX } from 'react';

export const LoadingScreen = (): JSX.Element | null => {
  const isAppReady = useTaskStore((state) => state.isInitialized);
  const message = useTaskStore((state) => state.loadingMessage);
  const isError = useTaskStore((state) => state.loadingHasError);

  const [isRemoved, setIsRemoved] = useState(false);

  useEffect(() => {
    if (isAppReady) {
      const timer = setTimeout(() => {
        setIsRemoved(true);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isAppReady]);

  if (isRemoved) {
    return null;
  }

  const containerClass = clsx('loading-screen-container', isAppReady ? 'opacity-0' : 'opacity-100');
  const titleClass = clsx('loading-screen-title', isError ? 'text-danger-fg' : 'text-content-secondary');

  return (
    <div className={containerClass}>
      <div className="flex-col-center p-3">
        {isError ? (
          <AlertTriangle className="text-danger-fg" size={ICON_SIZES.XXL} />
        ) : (
          <Loader2 size={ICON_SIZES.XXL} className="animate-spin text-info-fg" />
        )}
        <h1 className={titleClass}>{isError ? 'Kitchen on Fire!' : 'Opening the Baratie'}</h1>
        <p key={message} className="fade-in-text mt-2 text-content-tertiary">
          {isError ? `Galley Disaster: ${message}` : message}
        </p>
      </div>
    </div>
  );
};
