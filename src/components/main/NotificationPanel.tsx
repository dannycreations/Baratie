import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { ICON_SIZES, NOTIFICATION_EXIT_MS, NOTIFICATION_SHOW_MS } from '../../app/constants';
import { useControlTimer } from '../../hooks/useControlTimer';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../utilities/styleUtil';
import { Button } from '../shared/Button';
import { AlertTriangleIcon, CheckIcon, InfoIcon, XIcon } from '../shared/Icon';

import type { ElementType, JSX } from 'react';
import type { AppTheme } from '../../app/themes';
import type { NotificationMessage, NotificationType } from '../../app/types';

interface NotificationItemProps {
  readonly notification: NotificationMessage;
}

interface NotificationTheme {
  readonly barColor: string;
  readonly borderColor: string;
  readonly iconColor: string;
}

const NOTIFICATION_THEME_MAP: Readonly<Record<NotificationType, (theme: AppTheme) => NotificationTheme>> = {
  error: (theme) => ({ barColor: theme.dangerBg, borderColor: theme.dangerBorder, iconColor: theme.dangerFg }),
  success: (theme) => ({ barColor: theme.successBg, borderColor: theme.successBorder, iconColor: theme.successFg }),
  warning: (theme) => ({ barColor: theme.warningBg, borderColor: theme.warningBorder, iconColor: theme.warningFg }),
  info: (theme) => ({ barColor: theme.infoBg, borderColor: theme.infoBorder, iconColor: theme.infoFg }),
} as const;

const NOTIFICATION_ICON_MAP: Readonly<Record<NotificationType, ElementType>> = {
  success: CheckIcon,
  error: AlertTriangleIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
} as const;

function getNotificationTheme(theme: AppTheme, type: NotificationType): NotificationTheme {
  return (NOTIFICATION_THEME_MAP[type] || NOTIFICATION_THEME_MAP.info)(theme);
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
  const IconComponent = NOTIFICATION_ICON_MAP[notification.type] || InfoIcon;
  const renderedIcon = <IconComponent className={`text-${iconColor}`} size={ICON_SIZES.MD} />;

  const animationClass = isExiting ? 'notification-exit-active' : 'notification-enter-active';
  const duration = notification.duration ?? NOTIFICATION_SHOW_MS;

  const containerClass = cn(
    'relative w-full overflow-hidden rounded-lg border-l-4 shadow-lg',
    `border-${borderColor}`,
    `bg-${theme.surfaceSecondary}`,
    animationClass,
    isPaused && 'notification-paused',
  );

  const messageClass = cn('allow-text-selection text-sm', `text-${theme.contentSecondary}`, notification.title && 'mt-1');

  return (
    <li className={containerClass} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="flex items-start gap-2 p-3">
        <div className="flex-shrink-0">{renderedIcon}</div>
        <div className="flex-1">
          {notification.title && <h3 className={cn('font-semibold text-sm', `text-${theme.contentPrimary}`)}>{notification.title}</h3>}
          <p className={messageClass}>{notification.message}</p>
        </div>
        <div className="flex-shrink-0">
          <Button icon={<XIcon size={ICON_SIZES.MD} />} size="sm" variant="stealth" onClick={handleExit} />
        </div>
      </div>
      {!isExiting && (
        <div className={cn('absolute inset-x-0 bottom-0 h-1', `bg-${theme.surfaceTertiary}`)}>
          <div
            key={`${notification.id}-${notification.resetAt ?? 0}`}
            className={cn('h-full progress-bar-fill', `bg-${barColor}`)}
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
