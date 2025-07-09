import { memo } from 'react';

import type { HTMLAttributes, JSX, ReactNode } from 'react';

interface ItemListLayoutProps extends HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
  readonly leftContent: ReactNode;
  readonly leftWrapperClassName?: string;
  readonly rightContent?: ReactNode;
  readonly rightWrapperClassName?: string;
}

export const ItemListLayout = memo(function ItemListLayout({
  leftContent,
  rightContent,
  leftWrapperClassName: customLeftClass,
  rightWrapperClassName: customRightClass,
  className,
  ...rest
}: ItemListLayoutProps): JSX.Element {
  const finalContainerClass = ['flex w-full items-center justify-between', className].filter(Boolean).join(' ');
  const finalLeftWrapClass = customLeftClass || 'min-w-0 flex-grow';
  const finalRightWrapClass = customRightClass || 'flex flex-shrink-0 items-center space-x-1';

  return (
    <div className={finalContainerClass} {...rest}>
      <div className={finalLeftWrapClass}>{leftContent}</div>
      {rightContent && <div className={finalRightWrapClass}>{rightContent}</div>}
    </div>
  );
});
