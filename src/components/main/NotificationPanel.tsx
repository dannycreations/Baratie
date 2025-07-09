import { memo } from 'react';

import { useNotificationStore } from '../../stores/useNotificationStore';
import { NotificationItem } from './NotificationItem';

import type { JSX } from 'react';

export const NotificationPanel = memo(function NotificationPanel(): JSX.Element | null {
  const messages = useNotificationStore((state) => state.notifications);

  if (!messages.length) {
    return null;
  }

  return (
    <div aria-live="polite" aria-relevant="additions" className="fixed top-4 left-4 right-4 z-[100] space-y-1.5 sm:left-auto sm:w-full sm:max-w-sm">
      {messages.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
});
