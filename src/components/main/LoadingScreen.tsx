import { memo, useEffect, useState } from 'react';

import { useTaskStore } from '../../stores/useTaskStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { AlertTriangleIcon, Loader2Icon } from '../shared/Icon';

import type { JSX } from 'react';

export const LoadingScreen = memo((): JSX.Element | null => {
  const isAppReady = useTaskStore((state) => state.isInitialized);
  const message = useTaskStore((state) => state.loadingMessage);
  const isError = useTaskStore((state) => state.loadingHasError);
  const theme = useThemeStore((state) => state.theme);

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

  const containerClass = `fixed inset-0 z-[900] flex flex-col items-center justify-center bg-${theme.surfacePrimary} transition-opacity duration-300 ${isAppReady ? 'opacity-0' : 'opacity-100'}`;
  const titleClass = `mt-3 font-semibold tracking-wider text-2xl ${isError ? `text-${theme.dangerFg}` : `text-${theme.contentSecondary}`}`;

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center p-3 text-center">
        {isError ? (
          <AlertTriangleIcon className={`text-${theme.dangerFg}`} size={48} />
        ) : (
          <Loader2Icon size={48} className={`animate-spin text-${theme.infoFg}`} />
        )}
        <h1 className={titleClass}>{isError ? 'Kitchen on Fire!' : 'Opening the Baratie'}</h1>
        <p key={message} className={`fade-in-text mt-2 text-${theme.contentTertiary}`}>
          {isError ? `Galley Disaster: ${message}` : message}
        </p>
      </div>
    </div>
  );
});
