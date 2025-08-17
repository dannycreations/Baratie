import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { ICON_SIZES, NOTIFICATION_EXIT_MS, NOTIFICATION_SHOW_MS } from '../../app/constants';
import { useControlTimer } from '../../hooks/useControlTimer';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button } from '../shared/Button';
import { AlertTriangleIcon, CheckIcon, InfoIcon, XIcon } from '../shared/Icon';

import type { JSX } from 'react';
import type { AppTheme } from '../../app/themes';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationMessage {
  readonly id: string;
  readonly type: NotificationType;
  readonly message: string;
  readonly title?: string;
  readonly duration?: number;
  readonly resetAt?: number;
}

interface NotificationItemProps {
  readonly notification: NotificationMessage;
}

interface NotificationTheme {
  readonly barColor: string;
  readonly borderColor: string;
  readonly iconColor: string;
}

function getNotificationTheme(theme: AppTheme, type: NotificationType): NotificationTheme {
  switch (type) {
    case 'error':
      return { barColor: theme.dangerBg, borderColor: theme.dangerBorder, iconColor: theme.dangerFg };
    case 'success':
      return { barColor: theme.successBg, borderColor: theme.successBorder, iconColor: theme.successFg };
    case 'warning':
      return { barColor: theme.warningBg, borderColor: theme.warningBorder, iconColor: theme.warningFg };
    case 'info':
    default:
      return { barColor: theme.infoBg, borderColor: theme.infoBorder, iconColor: theme.infoFg };
  }
}

const NotificationItem = memo<NotificationItemProps>(({ notification }): JSX.Element => {
  const [isExiting, setExiting] = useState(false);
  const [isPaused, setPaused] = useState(false);

  const theme = useThemeStore((state) => state.theme);
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

  const { iconColor, borderColor, barColor } = getNotificationTheme(theme, notification.type);

  const renderedIcon = useMemo(() => {
    switch (notification.type) {
      case 'success':
        return <CheckIcon className={`text-${iconColor}`} size={ICON_SIZES.MD} />;
      case 'error':
      case 'warning':
        return <AlertTriangleIcon className={`text-${iconColor}`} size={ICON_SIZES.MD} />;
      case 'info':
      default:
        return <InfoIcon className={`text-${iconColor}`} size={ICON_SIZES.MD} />;
    }
  }, [notification.type, iconColor]);

  const animationClass = isExiting ? 'notification-exit-active' : 'notification-enter-active';
  const duration = notification.duration ?? NOTIFICATION_SHOW_MS;

  const containerClass =
    `relative w-full overflow-hidden rounded-lg border-l-4 border-${borderColor} bg-${theme.surfaceSecondary} shadow-lg ${animationClass} ${isPaused ? 'notification-paused' : ''}`.trim();

  const messageClass = `allow-text-selection text-sm text-${theme.contentSecondary} ${notification.title ? 'mt-1' : ''}`.trim();

  return (
    <li className={containerClass} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="flex items-start gap-2 p-3">
        <div className="flex-shrink-0">{renderedIcon}</div>
        <div className="flex-1">
          {notification.title && <h3 className={`font-semibold text-sm text-${theme.contentPrimary}`}>{notification.title}</h3>}
          <p className={messageClass}>{notification.message}</p>
        </div>
        <div className="flex-shrink-0">
          <Button icon={<XIcon size={ICON_SIZES.MD} />} size="sm" variant="stealth" title="Close" onClick={handleExit} />
        </div>
      </div>
      {!isExiting && (
        <div className={`absolute inset-x-0 bottom-0 h-1 bg-${theme.surfaceTertiary}`}>
          <div
            key={`${notification.id}-${notification.resetAt ?? 0}`}
            className={`h-full progress-bar-fill bg-${barColor}`}
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
    <ul className="fixed inset-x-3 top-3 z-[700] m-0 list-none space-y-2 p-0 sm:left-auto sm:w-full sm:max-w-sm">
      {messages.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </ul>
  );
});
