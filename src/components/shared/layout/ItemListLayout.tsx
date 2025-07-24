import { memo } from 'react';

import type { HTMLAttributes, JSX, ReactNode } from 'react';

interface ItemListLayoutProps extends HTMLAttributes<HTMLDivElement> {
  readonly leftContent: ReactNode;
  readonly leftClasses?: string;
  readonly rightContent?: ReactNode;
  readonly rightClasses?: string;
}

export const ItemListLayout = memo<ItemListLayoutProps>(
  ({ leftContent, rightContent, leftClasses, rightClasses, className, ...rest }): JSX.Element => {
    const containerClass = `flex w-full items-center justify-between ${className || ''}`.trim();
    const leftWrapClass = leftClasses || 'grow min-w-0';
    const rightWrapClass = rightClasses || 'flex shrink-0 items-center space-x-1';

    return (
      <div className={containerClass} {...rest}>
        <div className={leftWrapClass}>{leftContent}</div>
        {rightContent && <div className={rightWrapClass}>{rightContent}</div>}
      </div>
    );
  },
);
