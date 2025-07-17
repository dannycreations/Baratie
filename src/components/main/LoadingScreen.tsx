import { memo } from 'react';

import { useAppStore } from '../../stores/useAppStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { AlertTriangleIcon } from '../shared/Icon';

import type { JSX } from 'react';

export const LoadingScreen = memo((): JSX.Element => {
  const message = useAppStore((state) => state.loadingMessage);
  const isError = useAppStore((state) => state.loadingHasError);
  const theme = useThemeStore((state) => state.theme);

  const containerClass = `fixed inset-0 z-[900] flex flex-col items-center justify-center bg-${theme.surfacePrimary} transition-opacity duration-300`;
  const titleClass = `mt-6 text-2xl font-semibold tracking-wider ${isError ? `text-${theme.dangerFg}` : `text-${theme.contentSecondary}`}`;

  return (
    <div role="status" aria-live="polite" aria-label={isError ? 'Application Failed to Load' : 'Loading Application'} className={containerClass}>
      <div className="p-4 text-center flex flex-col items-center">
        {isError ? (
          <AlertTriangleIcon className={`text-${theme.dangerFg}`} size={48} />
        ) : (
          <svg
            aria-hidden="true"
            className={`h-12 w-12 animate-spin text-${theme.infoFg}`}
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              fill="currentColor"
            />
          </svg>
        )}
        <h1 className={titleClass}>{isError ? 'Kitchen on Fire!' : 'Opening the Baratie'}</h1>
        <p key={message} className={`fade-in-text mt-2 text-${theme.contentTertiary}`}>
          {isError ? `Galley Disaster: ${message}` : message}
        </p>
      </div>
    </div>
  );
});
