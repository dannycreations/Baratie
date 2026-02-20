import { clsx } from 'clsx';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { ICON_SIZES, NOTIFICATION_EXIT_MS, NOTIFICATION_SHOW_MS } from '../../app/constants';
import { useControlTimer } from '../../hooks/useControlTimer';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { Button } from '../shared/Button';

import type { JSX } from 'react';
import type { NotificationMessage, NotificationType } from '../../app/types';

interface NotificationItemProps {
  readonly notification: NotificationMessage;
}

interface NotificationTheme {
  readonly barClass: string;
  readonly borderClass: string;
  readonly iconClass: string;
}

const NOTIFICATION_THEME_MAP: Readonly<Record<NotificationType, NotificationTheme>> = {
  error: { barClass: 'bg-danger-bg', borderClass: 'border-danger-border', iconClass: 'text-danger-fg' },
  success: { barClass: 'bg-success-bg', borderClass: 'border-success-border', iconClass: 'text-success-fg' },
  warning: { barClass: 'bg-warning-bg', borderClass: 'border-warning-border', iconClass: 'text-warning-fg' },
  info: { barClass: 'bg-info-bg', borderClass: 'border-info-border', iconClass: 'text-info-fg' },
} as const;

const NOTIFICATION_ICON_MAP = {
  success: Check,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
} as const;

const getNotificationTheme = (type: NotificationType): NotificationTheme => {
  return NOTIFICATION_THEME_MAP[type] || NOTIFICATION_THEME_MAP.info;
};

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

  useControlTimer({
    callback: handleExit,
    duration: notification.duration ?? NOTIFICATION_SHOW_MS,
    reset: notification.resetAt,
    state: !isExiting && !isPaused,
  });

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

  const { iconClass, borderClass, barClass } = getNotificationTheme(notification.type);
  const IconComponent = NOTIFICATION_ICON_MAP[notification.type] || Info;
  const renderedIcon = <IconComponent className={iconClass} size={ICON_SIZES.MD} />;

  const animationClass = isExiting ? 'notification-exit-active' : 'notification-enter-active';
  const duration = notification.duration ?? NOTIFICATION_SHOW_MS;

  const containerClass = clsx('notification-item', borderClass, animationClass, isPaused && 'notification-paused');

  const messageClass = clsx('allow-text-selection text-sm text-content-secondary', notification.title && 'mt-1');

  return (
    <li className={containerClass} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="notification-content">
        <div className="shrink-0">{renderedIcon}</div>
        <div className="flex-1-min-0">
          {notification.title && <h3 className="text-sm font-semibold text-content-primary">{notification.title}</h3>}
          <p className={messageClass}>{notification.message}</p>
        </div>
        <div className="shrink-0">
          <Button icon={<X size={ICON_SIZES.MD} />} size="sm" variant="stealth" onClick={handleExit} />
        </div>
      </div>
      {!isExiting && (
        <div className="notification-progress-container">
          <div
            key={`${notification.id}-${notification.resetAt ?? 0}`}
            className={clsx('h-full progress-bar-fill', barClass)}
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
  const order = useNotificationStore((state) => state.order);
  const map = useNotificationStore((state) => state.map);

  const messages = useMemo(() => {
    return order.map((id) => map.get(id)).filter((n) => !!n);
  }, [order, map]);

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
