import { clsx } from 'clsx';
import { useEffect, useState } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { useTaskStore } from '../../stores/useTaskStore';
import { AlertTriangleIcon, Loader2Icon } from '../shared/Icon';

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

  const containerClass = clsx(
    'fixed inset-0 z-[900] flex flex-col items-center justify-center bg-surface-primary transition-opacity duration-300',
    isAppReady ? 'opacity-0' : 'opacity-100',
  );
  const titleClass = clsx('mt-3 text-2xl font-semibold tracking-wider', isError ? 'text-danger-fg' : 'text-content-secondary');

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center p-3 text-center">
        {isError ? (
          <AlertTriangleIcon className="text-danger-fg" size={ICON_SIZES.XXL} />
        ) : (
          <Loader2Icon size={ICON_SIZES.XXL} className="animate-spin text-info-fg" />
        )}
        <h1 className={titleClass}>{isError ? 'Kitchen on Fire!' : 'Opening the Baratie'}</h1>
        <p key={message} className="fade-in-text mt-2 text-content-tertiary">
          {isError ? `Galley Disaster: ${message}` : message}
        </p>
      </div>
    </div>
  );
};
