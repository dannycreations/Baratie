import { memo, useCallback, useEffect, useState } from 'react';

import { ANIMATION_EXIT_MS, NOTIFY_DURATION_MS } from '../../app/constants';
import { removeNotification } from '../../helpers/notificationHelper';
import { useConditionalTimer } from '../../hooks/useConditionalTimer';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button } from '../shared/Button';
import { AlertTriangleIcon, CheckIcon, InfoIcon, XIcon } from '../shared/Icon';

import type { JSX } from 'react';
import type { NotificationMessage, NotificationType } from '../../app/constants';
import type { AppTheme } from '../../app/themes';

interface NotifyItemProps {
  readonly notification: NotificationMessage;
}

type NotificationTheme = {
  readonly barColor: string;
  readonly borderColor: string;
  readonly iconColor: string;
};

function getNotificationTheme(theme: AppTheme, type: NotificationType): NotificationTheme {
  const map: Record<NotificationType, NotificationTheme> = {
    error: { barColor: theme.dangerBg, borderColor: theme.dangerBorder, iconColor: theme.dangerFg },
    info: { barColor: theme.infoBg, borderColor: theme.infoBorder, iconColor: theme.infoFg },
    success: { barColor: theme.successBg, borderColor: theme.successBorder, iconColor: theme.successFg },
    warning: { barColor: theme.warningBg, borderColor: theme.warningBorder, iconColor: theme.warningFg },
  };
  return map[type] || map.info;
}

export const NotificationItem = memo<NotifyItemProps>(({ notification }): JSX.Element => {
  const [isExiting, setExiting] = useState(false);
  const [isPaused, setPaused] = useState(false);
  const theme = useThemeStore((state) => state.theme);

  const startExit = useCallback(() => {
    setExiting(true);
  }, []);

  const handleMouseEnter = useCallback((): void => setPaused(true), []);
  const handleMouseLeave = useCallback((): void => setPaused(false), []);

  const timerState = isExiting ? 'stopped' : isPaused ? 'paused' : 'running';

  useConditionalTimer({
    state: timerState,
    callback: startExit,
    duration: notification.duration ?? NOTIFY_DURATION_MS,
    resetTrigger: notification.resetAt,
  });

  useEffect(() => {
    if (!isExiting) {
      return;
    }

    const timerId = window.setTimeout(() => {
      removeNotification(notification.id);
    }, ANIMATION_EXIT_MS);

    return () => {
      clearTimeout(timerId);
    };
  }, [isExiting, notification.id]);

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
  const duration = notification.duration ?? NOTIFY_DURATION_MS;

  const containerClasses = [
    'relative',
    'my-2',
    'w-full',
    'overflow-hidden',
    'rounded-lg',
    'border-l-4',
    `border-${borderColor}`,
    `bg-${theme.surfaceSecondary}`,
    animationClass,
    isPaused && 'notification-paused',
  ]
    .filter(Boolean)
    .join(' ');

  const messageClasses = ['text-sm', `text-${theme.contentSecondary}`, 'allow-text-selection', notification.title && 'mt-1']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={containerClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-start p-4">
        <div className="flex-shrink-0 pt-0.5">{renderIcon()}</div>
        <div className="ml-3 flex-1">
          {notification.title && <h3 className={`text-sm font-semibold text-${theme.contentPrimary}`}>{notification.title}</h3>}
          <p className={messageClasses}>{notification.message}</p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <Button
            aria-label="Close notification"
            className={`-mr-1 -mt-1 text-${theme.contentTertiary} hover:text-${theme.contentPrimary}`}
            icon={<XIcon size={20} />}
            onClick={startExit}
            size="sm"
            title="Close"
            variant="stealth"
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
