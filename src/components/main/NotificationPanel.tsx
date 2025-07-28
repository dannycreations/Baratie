import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { NOTIFICATION_EXIT_MS, NOTIFICATION_SHOW_MS } from '../../app/constants';
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
  const map: Record<NotificationType, NotificationTheme> = {
    error: { barColor: theme.dangerBg, borderColor: theme.dangerBorder, iconColor: theme.dangerFg },
    info: { barColor: theme.infoBg, borderColor: theme.infoBorder, iconColor: theme.infoFg },
    success: { barColor: theme.successBg, borderColor: theme.successBorder, iconColor: theme.successFg },
    warning: { barColor: theme.warningBg, borderColor: theme.warningBorder, iconColor: theme.warningFg },
  };
  return map[type] ?? map.info;
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

  const renderIcon = (): JSX.Element => {
    switch (notification.type) {
      case 'success':
        return <CheckIcon className={`text-${iconColor}`} size={22} />;
      case 'error':
      case 'warning':
        return <AlertTriangleIcon className={`text-${iconColor}`} size={22} />;
      case 'info':
      default:
        return <InfoIcon className={`text-${iconColor}`} size={22} />;
    }
  };

  const animationClass = isExiting ? 'notification-exit-active' : 'notification-enter-active';
  const duration = notification.duration ?? NOTIFICATION_SHOW_MS;

  const containerClass = `
    relative w-full overflow-hidden rounded-lg border-l-4
    bg-${theme.surfaceSecondary} border-${borderColor} ${animationClass}
    ${isPaused ? 'notification-paused' : ''}
  `.trim();

  const messageClass = `allow-text-selection text-sm text-${theme.contentSecondary} ${notification.title ? 'mt-1' : ''}`.trim();

  return (
    <div
      className={containerClass}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start gap-2 p-2">
        <div className="flex-shrink-0 pt-1">{renderIcon()}</div>
        <div className="flex-1">
          {notification.title && <h3 className={`text-sm font-semibold text-${theme.contentPrimary}`}>{notification.title}</h3>}
          <p className={messageClass}>{notification.message}</p>
        </div>
        <div className="flex-shrink-0">
          <Button
            icon={<XIcon size={20} />}
            size="sm"
            variant="stealth"
            title="Close"
            className={`text-${theme.contentTertiary} hover:text-${theme.contentPrimary}`}
            aria-label="Close notification"
            onClick={handleExit}
          />
        </div>
      </div>
      {!isExiting && (
        <div className={`absolute inset-x-0 bottom-0 h-1 bg-${theme.surfaceTertiary}`}>
          <div
            key={`${notification.id}-${notification.resetAt ?? 0}`}
            className={`h-full bg-${barColor} progress-bar-fill`}
            style={{
              animationDuration: `${duration}ms`,
            }}
          />
        </div>
      )}
    </div>
  );
});

export const NotificationPanel = memo((): JSX.Element | null => {
  const order = useNotificationStore((state) => state.order);
  const map = useNotificationStore((state) => state.map);

  const messages = useMemo(() => {
    return order.map((id) => map.get(id)).filter((n): n is NotificationMessage => !!n);
  }, [order, map]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 top-3 z-[700] space-y-2 sm:left-auto sm:w-full sm:max-w-sm" aria-live="polite" aria-relevant="additions">
      {messages.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
});
