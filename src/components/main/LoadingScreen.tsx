import { memo, useEffect, useState } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { useTaskStore } from '../../stores/useTaskStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../utilities/styleUtil';
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

  const containerClass = cn(
    'fixed inset-0 z-[900] flex flex-col items-center justify-center transition-opacity duration-300',
    `bg-${theme.surfacePrimary}`,
    isAppReady ? 'opacity-0' : 'opacity-100',
  );
  const titleClass = cn('mt-3 font-semibold tracking-wider text-2xl', isError ? `text-${theme.dangerFg}` : `text-${theme.contentSecondary}`);

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center p-3 text-center">
        {isError ? (
          <AlertTriangleIcon className={`text-${theme.dangerFg}`} size={ICON_SIZES.XXL} />
        ) : (
          <Loader2Icon size={ICON_SIZES.XXL} className={cn('animate-spin', `text-${theme.infoFg}`)} />
        )}
        <h1 className={titleClass}>{isError ? 'Kitchen on Fire!' : 'Opening the Baratie'}</h1>
        <p key={message} className={cn('fade-in-text mt-2', `text-${theme.contentTertiary}`)}>
          {isError ? `Galley Disaster: ${message}` : message}
        </p>
      </div>
    </div>
  );
});
