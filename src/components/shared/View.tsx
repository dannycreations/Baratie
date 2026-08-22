import { cn } from 'cnfast';

import type { JSX, ReactNode } from 'react';

interface EmptyViewProps {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly icon?: ReactNode;
  readonly title?: string;
}

export const EmptyView = ({ children, className, icon, title }: EmptyViewProps): JSX.Element => {
  const containerClass = cn('empty-view-container', className);

  return (
    <div className={containerClass}>
      {icon && <div className="empty-view-icon">{icon}</div>}
      {title && <h3 className="empty-view-title">{title}</h3>}
      {children && <p className="empty-view-text">{children}</p>}
    </div>
  );
};
