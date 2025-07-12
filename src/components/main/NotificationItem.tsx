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

function getNotificationTheme(theme: AppTheme, type: NotificationType) {
  const map: Record<NotificationType, { readonly bar: string; readonly border: string; readonly icon: string }> = {
    error: { bar: theme.errorBg, border: theme.errorBorder, icon: theme.errorTextDark },
    info: { bar: theme.infoBg, border: theme.infoBorder, icon: theme.infoText },
    success: { bar: theme.successBg, border: theme.successBorder, icon: theme.successTextDark },
    warning: { bar: theme.warningBg, border: theme.warningBorder, icon: theme.warningTextDark },
  };
  return map[type] || map.info;
}

export const NotificationItem = memo(function NotificationItem({ notification }: NotifyItemProps): JSX.Element {
  const [isExiting, setExiting] = useState(false);
  const [isPaused, setPaused] = useState(false);
  const theme = useThemeStore((state) => state.theme);

  const startExit = useCallback(() => {
    setExiting(true);
  }, []);

  const onMouseEnter = useCallback((): void => setPaused(true), []);
  const onMouseLeave = useCallback((): void => setPaused(false), []);

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

  const renderIcon = (): JSX.Element => {
    switch (notification.type) {
      case 'success':
        return <CheckIcon className={iconColor} size={22} />;
      case 'error':
      case 'warning':
        return <AlertTriangleIcon className={iconColor} size={22} />;
      case 'info':
      default:
        return <InfoIcon className={iconColor} size={22} />;
    }
  };

  const { icon: iconColor, border: borderClass, bar: barBackgroundClass } = getNotificationTheme(theme, notification.type);
  const animationClass = isExiting ? 'notification-exit-active' : 'notification-enter-active';
  const duration = notification.duration ?? NOTIFY_DURATION_MS;

  const containerClasses = [
    'relative',
    'my-2',
    'w-full',
    'overflow-hidden',
    'rounded-lg',
    'border-l-4',
    theme.cardBg,
    theme.shadow2xl,
    borderClass,
    animationClass,
    isPaused && 'notification-paused',
  ]
    .filter(Boolean)
    .join(' ');

  const messageClasses = ['allow-text-selection', 'text-sm', theme.textSecondary, notification.title && 'mt-1'].filter(Boolean).join(' ');

  return (
    <div role="alert" aria-live="assertive" aria-atomic="true" className={containerClasses} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="flex items-start p-4">
        <div className="flex-shrink-0 pt-0.5">{renderIcon()}</div>
        <div className="ml-3 flex-1">
          {notification.title && <h3 className={`text-md font-semibold ${theme.textPrimary}`}>{notification.title}</h3>}
          <p className={messageClasses}>{notification.message}</p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <Button
            aria-label="Close notification"
            className={`-mt-1 -mr-1 ${theme.textTertiary} ${theme.textPrimaryHover}`}
            icon={<XIcon size={20} />}
            onClick={startExit}
            size="sm"
            title="Close"
            variant="stealth"
          />
        </div>
      </div>
      {!isExiting && (
        <div className={`absolute inset-x-0 bottom-0 h-1 ${theme.itemBg}`}>
          <div
            key={`${notification.id}-${notification.resetAt ?? 0}`}
            className={`progress-bar-fill h-full ${barBackgroundClass}`}
            style={{
              animationDuration: `${duration}ms`,
            }}
          />
        </div>
      )}
    </div>
  );
});
