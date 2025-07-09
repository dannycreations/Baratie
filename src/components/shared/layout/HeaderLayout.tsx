import { memo } from 'react';

import type { JSX, ReactNode } from 'react';

interface HeaderLayoutProps {
  readonly leftContent: ReactNode;
  readonly rightContent?: ReactNode;
}

export const HeaderLayout = memo(function HeaderLayout({ leftContent, rightContent }: HeaderLayoutProps): JSX.Element {
  return (
    <>
      {leftContent}
      {rightContent && <div className="flex items-center space-x-1.5">{rightContent}</div>}
    </>
  );
});
