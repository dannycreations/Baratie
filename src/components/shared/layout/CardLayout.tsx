import { memo, useId } from 'react';

import { useOverflowScroll } from '../../../hooks/useOverflowScroll';
import { useThemeStore } from '../../../stores/useThemeStore';
import { HeaderLayout } from './HeaderLayout';

import type { JSX, ReactNode } from 'react';

interface CardLayoutProps {
  readonly ariaLive?: 'assertive' | 'off' | 'polite';
  readonly children: ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly headerActions?: ReactNode;
  readonly title: ReactNode;
}

export const CardLayout = memo(function CardLayout({
  title,
  headerActions,
  children,
  className = '',
  contentClassName = '',
  ariaLive,
}: CardLayoutProps): JSX.Element {
  const contentRef = useOverflowScroll<HTMLDivElement>({ xClassName: 'pr-2', yClassName: 'pb-2' });
  const titleId = useId();
  const theme = useThemeStore((state) => state.theme);

  const finalHeaderClass = [
    'flex',
    'h-12',
    'flex-shrink-0',
    'items-center',
    'justify-between',
    'p-3',
    theme.textPrimary,
    theme.cardHeaderBg,
    theme.cardHeaderBorder,
  ]
    .filter(Boolean)
    .join(' ');
  const finalContentClass = ['flex-grow', 'overflow-auto', 'p-3', contentClassName].filter(Boolean).join(' ');
  const finalContainerClass = ['flex', 'flex-col', 'overflow-hidden', 'rounded-lg', theme.cardBg, theme.shadowXl, className]
    .filter(Boolean)
    .join(' ');

  return (
    <section role="region" aria-live={ariaLive} aria-labelledby={titleId} className={finalContainerClass}>
      <div className={finalHeaderClass}>
        <HeaderLayout
          leftContent={
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
          }
          rightContent={headerActions}
        />
      </div>
      <div ref={contentRef} className={finalContentClass}>
        {children}
      </div>
    </section>
  );
});
