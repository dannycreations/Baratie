import { memo } from 'react';

import type { HTMLAttributes, JSX, ReactNode } from 'react';

interface ItemListLayoutProps extends HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
  readonly leftContent: ReactNode;
  readonly leftClass?: string;
  readonly rightContent?: ReactNode;
  readonly rightClass?: string;
}

export const ItemListLayout = memo<ItemListLayoutProps>(({ leftContent, rightContent, leftClass, rightClass, className, ...rest }): JSX.Element => {
  const containerClass = `flex w-full items-center justify-between ${className || ''}`.trim();
  const leftWrapClass = leftClass || 'grow min-w-0';
  const rightWrapClass = rightClass || 'flex shrink-0 items-center space-x-1';

  return (
    <div className={containerClass} {...rest}>
      <div className={leftWrapClass}>{leftContent}</div>
      {rightContent && <div className={rightWrapClass}>{rightContent}</div>}
    </div>
  );
});
