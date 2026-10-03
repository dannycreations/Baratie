import { cn } from 'cn';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { ICON_SIZES, NOTIFICATION_EXIT_MS, NOTIFICATION_SHOW_MS } from '../../app/constants';
import { useControlTimer } from '../../hooks/useControlTimer';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { Button } from '../shared/Button';

import type { JSX } from 'react';
import type { NotificationMessage, NotificationType } from '../../stores/useNotificationStore';

interface NotificationItemProps {
  readonly notification: NotificationMessage;
}

interface NotificationStyle {
  readonly icon: JSX.Element;
  readonly barClass: string;
  readonly borderClass: string;
}

const NOTIFICATION_STYLE: Readonly<Record<NotificationType, NotificationStyle>> = {
  error: { icon: <AlertTriangle className="text-danger-fg" size={ICON_SIZES.MD} />, barClass: 'bg-danger-bg', borderClass: 'border-danger-border' },
  success: { icon: <Check className="text-success-fg" size={ICON_SIZES.MD} />, barClass: 'bg-success-bg', borderClass: 'border-success-border' },
  warning: {
    icon: <AlertTriangle className="text-warning-fg" size={ICON_SIZES.MD} />,
    barClass: 'bg-warning-bg',
    borderClass: 'border-warning-border',
  },
  info: { icon: <Info className="text-info-fg" size={ICON_SIZES.MD} />, barClass: 'bg-info-bg', borderClass: 'border-info-border' },
} as const;

const NotificationItem = memo<NotificationItemProps>(({ notification }): JSX.Element => {
  const [isExiting, setExiting] = useState(false);
  const [isPaused, setPaused] = useState(false);

  const removeNotification = useNotificationStore((state) => state.remove);

  const handleExit = useCallback((): void => {
    setExiting(true);
  }, []);

  const handleMouseEnter = useCallback((): void => {
    setPaused(true);
  }, []);

  const handleMouseLeave = useCallback((): void => {
    setPaused(false);
  }, []);

  const duration = notification.duration ?? NOTIFICATION_SHOW_MS;

  useControlTimer({ active: !isExiting && !isPaused, callback: handleExit, duration, restartKey: notification.resetAt });

  useEffect(() => {
    if (!isExiting) {
      return;
    }
    const timerId = window.setTimeout(() => {
      removeNotification(notification.id);
    }, NOTIFICATION_EXIT_MS);

    return () => {
      clearTimeout(timerId);
    };
  }, [isExiting, notification.id, removeNotification]);

  const { icon, borderClass, barClass } = NOTIFICATION_STYLE[notification.type];

  const animationClass = isExiting ? 'notification-exit-active' : 'notification-enter-active';

  const containerClass = cn('notification-item', borderClass, animationClass, isPaused && 'notification-paused');

  const messageClass = cn('allow-text-selection text-sm text-content-secondary', notification.title && 'mt-1');

  return (
    <li className={containerClass} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="notification-content">
        <div className="shrink-0">{icon}</div>
        <div className="flex-1-min-0">
          {notification.title && <h3 className="text-sm font-semibold text-content-primary">{notification.title}</h3>}
          <p className={messageClass}>{notification.message}</p>
        </div>
        <div className="shrink-0">
          <Button icon={<X size={ICON_SIZES.MD} />} variant="stealth" onClick={handleExit} />
        </div>
      </div>
      {!isExiting && (
        <div className="notification-progress-container">
          <div
            key={`${notification.id}-${notification.resetAt ?? 0}`}
            className={cn('h-full progress-bar-fill', barClass)}
            style={{
              animationDuration: `${duration}ms`,
            }}
          />
        </div>
      )}
    </li>
  );
});

export const NotificationPanel = memo((): JSX.Element | null => {
  const map = useNotificationStore((state) => state.map);

  const messages = useMemo(() => {
    return Array.from(map.values());
  }, [map]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <ul className="fixed inset-x-3 top-3 z-[700] m-0 list-none list-container p-0 sm:left-auto sm:w-full sm:max-w-sm">
      {messages.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </ul>
  );
});
